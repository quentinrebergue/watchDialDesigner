import paper from 'paper';
import type { Tool, SnapSettings, GridSettings, MeasureSnapMode, DialShape } from '../store';
import type { EngineCallbacks } from './types';
import type { DrawStyle } from './handlers/MouseHandlers';
import type { PendingActionState } from './handlers/PendingAction';
import type { PendingCutData } from './handlers/CutHandler';
import { GridRenderer } from './GridRenderer';
import { SnapManager } from './SnapManager';
import { SelectionManager } from './SelectionManager';
import { DrawingTools } from './DrawingTools';
import { bindMouseHandlers } from './handlers/MouseHandlers';
import { clearPendingCuts } from './handlers/CutHandler';
import { cancelPendingAction, startCenterH, startCenterV, startRadialClone } from './handlers/PendingAction';
import {
  saveProject, loadProject, exportSVG, exportDrawingSVG,
  importDesign, createComponentFromSelection, placeComponentInstance,
} from './handlers/ProjectIO';
import { booleanSubtract, booleanUnite, booleanIntersect, mirrorHorizontal, mirrorVertical } from './selection/BooleanOps';

/**
 * CanvasEngine is the thin orchestrator that wires Paper.js events
 * to the specialised sub-modules.
 *
 * Properties are public so that handler modules can access them.
 */
export class CanvasEngine {
  // Core
  public canvas: HTMLCanvasElement;
  public scope: paper.PaperScope;
  private paperTool: paper.Tool;

  // Layers
  public gridLayer!: paper.Layer;
  public dialLayer!: paper.Layer;
  public drawLayer!: paper.Layer;
  public overlayLayer!: paper.Layer;

  // Sub-modules
  public gridRenderer!: GridRenderer;
  public snapMgr!: SnapManager;
  public selection!: SelectionManager;
  public tools!: DrawingTools;

  // Current state
  private _showGrid = true;
  private _diameter = 28.5;
  public currentTool: Tool = 'select';

  // Pan state
  public isPanning = false;
  public lastPanPoint: paper.Point | null = null;

  // Cut tool: pending cut points per item
  public pendingCuts: Map<number, PendingCutData> = new Map();

  // Style defaults
  private _strokeColor = '#000000';
  private _fillColor = 'transparent';
  private _strokeWidth = 0.5;
  private _polygonSides = 6;

  // Dial appearance
  private _dialColor = '#ffffff';
  private _dialShape: DialShape = 'circle';

  // Measure snap mode
  private _measureSnapMode: MeasureSnapMode = 'free';

  // Callbacks
  public onSelectionChange?: EngineCallbacks['onSelectionChange'];
  public onPushUndo?: EngineCallbacks['onPushUndo'];
  public onZoomChange?: EngineCallbacks['onZoomChange'];
  public onToolChange?: EngineCallbacks['onToolChange'];
  public onStatusMessage?: EngineCallbacks['onStatusMessage'];

  // Pending point-pick action (center H/V, radial clone)
  public pendingAction: PendingActionState | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scope = new paper.PaperScope();
    this.scope.setup(canvas);

    // Create internal layers
    this.dialLayer = new this.scope.Layer(); this.dialLayer.name = 'dial';
    this.drawLayer = new this.scope.Layer(); this.drawLayer.name = 'draw';
    this.gridLayer = new this.scope.Layer(); this.gridLayer.name = 'grid';
    this.overlayLayer = new this.scope.Layer(); this.overlayLayer.name = 'overlay';
    this.drawLayer.activate();

    // Build shared context
    const ctx = {
      scope: this.scope,
      canvas,
      gridLayer: this.gridLayer,
      dialLayer: this.dialLayer,
      drawLayer: this.drawLayer,
      overlayLayer: this.overlayLayer,
      callbacks: {
        onSelectionChange: (...a: Parameters<NonNullable<EngineCallbacks['onSelectionChange']>>) => this.onSelectionChange?.(...a),
        onPushUndo: (...a: Parameters<NonNullable<EngineCallbacks['onPushUndo']>>) => this.onPushUndo?.(...a),
        onZoomChange: (...a: Parameters<NonNullable<EngineCallbacks['onZoomChange']>>) => this.onZoomChange?.(...a),
        onToolChange: (...a: Parameters<NonNullable<EngineCallbacks['onToolChange']>>) => this.onToolChange?.(...a),
        onStatusMessage: (...a: Parameters<NonNullable<EngineCallbacks['onStatusMessage']>>) => this.onStatusMessage?.(...a),
      },
    };

    // Initialise sub-modules
    this.gridRenderer = new GridRenderer(ctx);
    this.snapMgr = new SnapManager(ctx);
    this.selection = new SelectionManager(ctx);
    this.tools = new DrawingTools(ctx);

    // Wire Paper.js tool events via handler module
    this.paperTool = new this.scope.Tool();
    bindMouseHandlers(this, this.paperTool);

    // Wheel zoom
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Initial render
    this.centerView();
    this.gridRenderer.drawGrid(this._showGrid, this._diameter, this.snapMgr.gridSettings, this.scope.view.zoom);
    this.gridRenderer.drawDial(this._diameter, this._dialColor, this._dialShape);
  }

  // ── Computed getters (used by handlers) ──────────────────

  get drawStyle(): DrawStyle {
    return {
      strokeColor: this._strokeColor,
      fillColor: this._fillColor,
      strokeWidth: this._strokeWidth,
      polygonSides: this._polygonSides,
    };
  }

  get measureSnapMode() { return this._measureSnapMode; }
  get strokeColor() { return this._strokeColor; }
  get diameter() { return this._diameter; }

  // ── Public API ───────────────────────────────────────────

  setTool(tool: Tool) {
    this.tools.finishPolyline(false, this.drawStyle);
    this.tools.clearPreview();
    this.tools.clearMeasure();
    this.tools.measureStartPoint = null;
    clearPendingCuts(this.pendingCuts);
    cancelPendingAction(this);
    if (tool !== 'select' && tool !== 'measure') this.selection.deselectAll();
    this.currentTool = tool;
    this.canvas.style.cursor = tool === 'select' ? 'default' : tool === 'pan' ? 'grab' : 'crosshair';
  }

  setStrokeColor(c: string) { this._strokeColor = c; }
  setFillColor(c: string) { this._fillColor = c; }
  setStrokeWidth(w: number) { this._strokeWidth = w; }
  setPolygonSides(n: number) { this._polygonSides = n; }

  setDiameter(d: number) {
    this._diameter = d;
    this.gridRenderer.drawGrid(this._showGrid, d, this.snapMgr.gridSettings, this.scope.view.zoom);
    this.gridRenderer.drawDial(d, this._dialColor, this._dialShape);
  }

  setDialColor(c: string) {
    this._dialColor = c;
    this.gridRenderer.drawDial(this._diameter, c, this._dialShape);
  }

  setDialShape(s: DialShape) {
    this._dialShape = s;
    this.gridRenderer.drawDial(this._diameter, this._dialColor, s);
  }

  setShowGrid(v: boolean) {
    this._showGrid = v;
    this.gridRenderer.drawGrid(v, this._diameter, this.snapMgr.gridSettings, this.scope.view.zoom);
  }

  setGridSettings(s: GridSettings) {
    this.snapMgr.setGridSettings(s);
    this.gridRenderer.drawGrid(this._showGrid, this._diameter, s, this.scope.view.zoom);
  }

  setSnap(s: SnapSettings) { this.snapMgr.setSnap(s); }
  setMeasureSnapMode(m: MeasureSnapMode) { this._measureSnapMode = m; }
  getZoom(): number { return this.scope.view.zoom; }

  // ── View ─────────────────────────────────────────────────

  private centerView() {
    this.scope.view.center = new this.scope.Point(0, 0);
    const viewSize = Math.min(this.scope.view.size.width, this.scope.view.size.height);
    const dialPx = this._diameter * 10;
    const zoom = (viewSize * 0.7) / dialPx;
    this.scope.view.zoom = zoom;
    this.onZoomChange?.(zoom);
    this.redrawGrid();
  }

  resize() {
    this.scope.view.viewSize = new this.scope.Size(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  fitToView() { this.centerView(); }

  resetZoom() {
    this.scope.view.zoom = 1;
    this.scope.view.center = new this.scope.Point(0, 0);
    this.onZoomChange?.(1);
    this.redrawGrid();
  }

  zoomIn() {
    const newZoom = Math.min(100, this.scope.view.zoom * 1.2);
    this.scope.view.zoom = newZoom;
    this.onZoomChange?.(newZoom);
    this.redrawGrid();
  }

  zoomOut() {
    const newZoom = Math.max(0.1, this.scope.view.zoom / 1.2);
    this.scope.view.zoom = newZoom;
    this.onZoomChange?.(newZoom);
    this.redrawGrid();
  }

  redrawGrid() {
    this.gridRenderer.drawGrid(this._showGrid, this._diameter, this.snapMgr.gridSettings, this.scope.view.zoom);
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const oldZoom = this.scope.view.zoom;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(100, oldZoom * delta));
    const mousePos = new this.scope.Point(e.offsetX, e.offsetY);
    const viewPos = this.scope.view.viewToProject(mousePos);
    this.scope.view.zoom = newZoom;
    const newViewPos = this.scope.view.viewToProject(mousePos);
    const shift = newViewPos.subtract(viewPos);
    this.scope.view.center = this.scope.view.center.subtract(shift);
    this.onZoomChange?.(newZoom);
    this.redrawGrid();
  }

  // ── Undo helpers ─────────────────────────────────────────

  pushUndoState() {
    this.drawLayer.activate();
    const json = this.drawLayer.exportJSON();
    this.onPushUndo?.(json);
  }

  restoreFromJSON(json: string) {
    this.drawLayer.activate();
    this.drawLayer.removeChildren();
    this.drawLayer.importJSON(json);
    clearPendingCuts(this.pendingCuts);
    this.selection.deselectAll();
  }

  /** Auto-select an item and switch to select tool. */
  autoSelect(item: paper.Item) {
    this.selection.selectItem(item);
    this.currentTool = 'select';
    this.canvas.style.cursor = 'default';
    this.onToolChange?.('select');
  }

  // ── Delegated public methods ─────────────────────────────

  deleteSelected() { this.selection.deleteSelected(() => this.pushUndoState()); }
  duplicateSelected() { this.selection.duplicateSelected(() => this.pushUndoState()); }
  startReplaceMode() { this.selection.startReplaceMode(); }
  copySelected() { this.selection.copySelected(); }
  paste() {
    const snap = this.snapMgr.snap;
    const gs = this.snapMgr.gridSettings;
    this.selection.paste(() => this.pushUndoState(), true, snap.mode === 'grid', gs.snapSpacing);
  }
  setShowCenterPoint(show: boolean) { this.selection.setShowCenterPoint(show); }

  // Selection property setters
  setSelectionPosition(x: number, y: number) { this.selection.setPosition(x, y, () => this.pushUndoState()); }
  centerSelectionHorizontally() { startCenterH(this); }
  centerSelectionVertically() { startCenterV(this); }
  setSelectionSize(w: number, h: number) { this.selection.setSize(w, h, () => this.pushUndoState()); }
  setSelectionRotation(deg: number) { this.selection.setRotation(deg, () => this.pushUndoState()); }
  setSelectionTextContent(t: string) { this.selection.setTextContent(t, () => this.pushUndoState()); }
  setSelectionStrokeColor(c: string) { this.selection.setStrokeColor(c, () => this.pushUndoState()); }
  setSelectionFillColor(c: string) { this.selection.setFillColor(c, () => this.pushUndoState()); }
  setSelectionStrokeWidth(w: number) { this.selection.setStrokeWidth(w, () => this.pushUndoState()); }
  setSelectionTextAlignH(a: 'left' | 'center' | 'right') { this.selection.setTextAlignH(a, () => this.pushUndoState()); }
  setSelectionTextAlignV(a: 'top' | 'center' | 'bottom') { this.selection.setTextAlignV(a, () => this.pushUndoState()); }

  // Boolean / transform operations (delegated to standalone functions)
  radialClone(count: number) { startRadialClone(this, count); }
  mirrorHorizontal() { mirrorHorizontal(this.selection, () => this.pushUndoState()); }
  mirrorVertical() { mirrorVertical(this.selection, () => this.pushUndoState()); }
  booleanSubtract() { booleanSubtract(this.selection, () => this.pushUndoState()); }
  booleanUnite() { booleanUnite(this.selection, () => this.pushUndoState()); }
  booleanIntersect() { booleanIntersect(this.selection, () => this.pushUndoState()); }

  measureBetweenSelected() {
    if (this.selection.selectedItems.length !== 2) return;
    const a = this.selection.selectedItems[0];
    const b = this.selection.selectedItems[1];
    this.selection.deselectAll();
    const item = this.tools.commitMeasureBetween(a.bounds.center, b.bounds.center, this._strokeColor);
    if (item) { this.pushUndoState(); this.autoSelect(item); }
  }

  // ── Project IO (delegated to handler module) ─────────────

  saveProject() { return saveProject(this); }
  loadProject(json: string) { return loadProject(this, json); }
  exportSVG() { return exportSVG(this); }
  exportDrawingSVG() { return exportDrawingSVG(this); }
  importDesign(json: string) { return importDesign(this, json); }
  createComponentFromSelection() { return createComponentFromSelection(this); }
  placeComponentInstance(id: string, json: string) { return placeComponentInstance(this, id, json); }

  // ── Clear all ─────────────────────────────────────────────

  clearAll() {
    this.drawLayer.activate();
    this.drawLayer.removeChildren();
    this.selection.deselectAll();
    this.pushUndoState();
  }

  // ── Cleanup ──────────────────────────────────────────────

  destroy() {
    this.paperTool.remove();
    this.scope.project.remove();
  }
}

