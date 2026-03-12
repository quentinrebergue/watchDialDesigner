import paper from 'paper';
import { MM_TO_PX, type EngineContext, type SelectionPropsPayload } from './types';
import { canPerformBoolean } from './selection/BooleanOps';

/**
 * Manages item selection, selection highlights, property gathering,
 * replace-mode, copy/paste, and the center-point overlay.
 */
export class SelectionManager {
  public ctx: EngineContext;

  // Selection state
  selectedItems: paper.Item[] = [];
  private selectionRect: paper.Path.Rectangle | null = null;
  isDraggingSelection = false;
  dragStart: paper.Point | null = null;
  marquee: paper.Path.Rectangle | null = null;

  // Replace
  private _replaceSource: paper.Item | null = null;

  // Copy/paste
  private _clipboard: string | null = null;

  // Center point overlay
  private _showCenterPoint = false;
  private centerPointMarker: paper.Group | null = null;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
  }

  // ── Selection highlight ──────────────────────────────────

  updateSelectionHighlight() {
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    this.selectionRect?.remove();
    this.selectionRect = null;

    if (this.selectedItems.length > 0) {
      const bounds = this.getSelectionBounds();
      if (bounds) {
        this.selectionRect = new scope.Path.Rectangle(bounds);
        this.selectionRect.strokeColor = new scope.Color('#2196F3');
        this.selectionRect.strokeWidth = 1 / scope.view.zoom;
        this.selectionRect.dashArray = [4 / scope.view.zoom, 4 / scope.view.zoom];
        this.selectionRect.fillColor = null;
      }
    }

    this.ctx.drawLayer.activate();

    // Gather selection properties
    let props: SelectionPropsPayload | null = null;
    if (this.selectedItems.length > 0) {
      const bounds = this.getSelectionBounds();
      const first = this.selectedItems[0];
      const isText = this.selectedItems.length === 1 && first instanceof paper.PointText;
      const textContent = isText ? (first as paper.PointText).content : '';
      const rotation = this.selectedItems.length === 1 ? (first.data?.rotation ?? 0) : 0;
      const strokeColor = first.strokeColor ? first.strokeColor.toCSS(true) : '#000000';
      const fillColor = first.fillColor ? first.fillColor.toCSS(true) : 'transparent';
      const strokeWidth = (first.strokeWidth ?? 1) / MM_TO_PX;
      const textAlignH: 'left' | 'center' | 'right' = isText ? (first.data?.textAlignH ?? 'left') : 'left';
      const textAlignV: 'top' | 'center' | 'bottom' = isText ? (first.data?.textAlignV ?? 'top') : 'top';
      props = {
        x: bounds ? bounds.center.x / MM_TO_PX : 0,
        y: bounds ? bounds.center.y / MM_TO_PX : 0,
        width: bounds ? bounds.width / MM_TO_PX : 0,
        height: bounds ? bounds.height / MM_TO_PX : 0,
        rotation, isText, textContent,
        strokeColor, fillColor, strokeWidth,
        textAlignH, textAlignV,
        canBoolean: canPerformBoolean(this.selectedItems),
      };
    }
    this.ctx.callbacks.onSelectionChange?.(this.selectedItems.length, props);
    this.updateCenterPointMarker();
  }

  private getSelectionBounds(): paper.Rectangle | null {
    let bounds: paper.Rectangle | null = null;
    for (const item of this.selectedItems) {
      if (!bounds) bounds = item.bounds.clone();
      else bounds = bounds.unite(item.bounds);
    }
    return bounds;
  }

  // ── Select / deselect ────────────────────────────────────

  deselectAll() {
    this.selectedItems.forEach((item) => { item.selected = false; });
    this.selectedItems = [];
    this.updateSelectionHighlight();
  }

  selectItem(item: paper.Item, addToSelection = false) {
    if (!addToSelection) this.deselectAll();
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
      item.selected = true;
    }
    this.updateSelectionHighlight();
  }

  // ── Delete / Duplicate ───────────────────────────────────

  deleteSelected(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    this.selectedItems.forEach((item) => item.remove());
    this.selectedItems = [];
    this.updateSelectionHighlight();
  }

  duplicateSelected(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    this.ctx.drawLayer.activate();
    const newItems: paper.Item[] = [];
    this.selectedItems.forEach((item) => {
      const clone = item.clone();
      clone.position = clone.position.add(new this.ctx.scope.Point(5, 5));
      newItems.push(clone);
    });
    this.deselectAll();
    newItems.forEach((item) => this.selectItem(item, true));
  }

  // ── Replace mode ─────────────────────────────────────────

  startReplaceMode() {
    if (this.selectedItems.length !== 1) return;
    this._replaceSource = this.selectedItems[0];
    this.ctx.canvas.style.cursor = 'crosshair';
  }

  get replaceSource() { return this._replaceSource; }

  clearReplaceMode() {
    this._replaceSource = null;
    this.ctx.canvas.style.cursor = 'default';
  }

  replaceItemWith(target: paper.Item, source: paper.Item, pushUndo: () => void) {
    pushUndo();
    this.ctx.drawLayer.activate();
    const targetCenter = target.bounds.center.clone();
    const targetWidth = target.bounds.width;
    const targetHeight = target.bounds.height;
    const targetRotation = target.data?.rotation ?? 0;

    const clone = source.clone();
    const sourceRotation = source.data?.rotation ?? 0;
    if (Math.abs(sourceRotation) > 0.001) {
      clone.rotate(-sourceRotation, clone.bounds.center);
    }
    if (clone.bounds.width > 0 && clone.bounds.height > 0) {
      const sx = targetWidth / clone.bounds.width;
      const sy = targetHeight / clone.bounds.height;
      clone.scale(sx, sy, clone.bounds.center);
    }
    clone.position = targetCenter;
    if (Math.abs(targetRotation) > 0.001) {
      clone.rotate(targetRotation, clone.bounds.center);
    }
    if (!clone.data) clone.data = {};
    clone.data.rotation = targetRotation;
    target.remove();
    this.deselectAll();
    this.selectItem(clone);
  }

  // ── Copy / Paste ─────────────────────────────────────────

  copySelected() {
    if (this.selectedItems.length === 0) return;
    const { scope } = this.ctx;
    const group = new scope.Group(this.selectedItems.map((i) => i.clone()));
    this._clipboard = group.exportJSON();
    group.remove();
  }

  paste(pushUndo: () => void, snapEnabled: boolean, snapGrid: boolean, snapSpacing: number) {
    if (!this._clipboard) return;
    pushUndo();
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const group = new scope.Group();
    group.importJSON(this._clipboard);
    const offset = snapEnabled && snapGrid ? snapSpacing * MM_TO_PX : 5;
    const items: paper.Item[] = [];
    const children = [...group.children];
    children.forEach((child) => {
      child.position = child.position.add(new scope.Point(offset, offset));
      this.ctx.drawLayer.addChild(child);
      items.push(child);
    });
    group.remove();
    this.deselectAll();
    items.forEach((item) => this.selectItem(item, true));
  }

  // ── Property setters ─────────────────────────────────────

  setPosition(xMm: number, yMm: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    const newCenter = new scope.Point(xMm * MM_TO_PX, yMm * MM_TO_PX);
    if (this.selectedItems.length === 1) {
      this.selectedItems[0].position = newCenter;
    } else {
      const bounds = this.getSelectionBounds();
      if (bounds) {
        const delta = newCenter.subtract(bounds.center);
        this.selectedItems.forEach((item) => { item.position = item.position.add(delta); });
      }
    }
    this.updateSelectionHighlight();
  }

  centerHorizontally(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => {
      item.position = new scope.Point(0, item.position.y);
    });
    this.updateSelectionHighlight();
  }

  centerVertically(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => {
      item.position = new scope.Point(item.position.x, 0);
    });
    this.updateSelectionHighlight();
  }

  setSize(wMm: number, hMm: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const bounds = this.getSelectionBounds();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;
    const sx = (wMm * MM_TO_PX) / bounds.width;
    const sy = (hMm * MM_TO_PX) / bounds.height;
    this.selectedItems.forEach((item) => { item.scale(sx, sy, bounds!.center); });
    this.updateSelectionHighlight();
  }

  setRotation(degrees: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    const clamped = Math.max(-360, Math.min(360, degrees));
    const current = this.selectedItems.length === 1 ? (this.selectedItems[0].data?.rotation ?? 0) : 0;
    const delta = clamped - current;
    if (Math.abs(delta) < 0.001) return;
    const bounds = this.getSelectionBounds();
    const center = bounds?.center ?? new scope.Point(0, 0);
    this.selectedItems.forEach((item) => {
      item.rotate(delta, center);
      if (!item.data) item.data = {};
      item.data.rotation = clamped;
    });
    this.updateSelectionHighlight();
  }

  setTextContent(text: string, pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (!(item instanceof paper.PointText)) return;
    pushUndo();
    item.content = text;
    this.updateSelectionHighlight();
  }

  setStrokeColor(color: string, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => { item.strokeColor = new scope.Color(color); });
    this.updateSelectionHighlight();
  }

  setFillColor(color: string, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => {
      item.fillColor = color === 'transparent' ? null : new scope.Color(color);
    });
    this.updateSelectionHighlight();
  }

  setStrokeWidth(widthMm: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    this.selectedItems.forEach((item) => { item.strokeWidth = widthMm * MM_TO_PX; });
    this.updateSelectionHighlight();
  }

  setTextAlignH(align: 'left' | 'center' | 'right', pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (!(item instanceof paper.PointText)) return;
    pushUndo();
    item.justification = align;
    if (!item.data) item.data = {};
    item.data.textAlignH = align;
    this.updateSelectionHighlight();
  }

  setTextAlignV(align: 'top' | 'center' | 'bottom', pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (!(item instanceof paper.PointText)) return;
    pushUndo();
    if (!item.data) item.data = {};
    item.data.textAlignV = align;
    this.updateSelectionHighlight();
  }

  // ── Radial clone / mirror ────────────────────────────────

  // ── Center point overlay ─────────────────────────────────

  setShowCenterPoint(show: boolean) {
    this._showCenterPoint = show;
    this.updateCenterPointMarker();
  }

  private updateCenterPointMarker() {
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    this.centerPointMarker?.remove();
    this.centerPointMarker = null;

    if (this._showCenterPoint && this.selectedItems.length > 0) {
      const bounds = this.getSelectionBounds();
      if (bounds) {
        const center = bounds.center;
        const size = 6 / scope.view.zoom;
        const group = new scope.Group();
        const h = new scope.Path.Line(
          new scope.Point(center.x - size, center.y),
          new scope.Point(center.x + size, center.y),
        );
        h.strokeColor = new scope.Color('#e53935');
        h.strokeWidth = 1 / scope.view.zoom;
        const v = new scope.Path.Line(
          new scope.Point(center.x, center.y - size),
          new scope.Point(center.x, center.y + size),
        );
        v.strokeColor = new scope.Color('#e53935');
        v.strokeWidth = 1 / scope.view.zoom;
        const c = new scope.Path.Circle(center, size * 0.4);
        c.strokeColor = new scope.Color('#e53935');
        c.strokeWidth = 1 / scope.view.zoom;
        c.fillColor = null;
        group.addChild(h);
        group.addChild(v);
        group.addChild(c);
        this.centerPointMarker = group;
      }
    }

    this.ctx.drawLayer.activate();
  }
}
