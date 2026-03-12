import type { CanvasEngine } from '../CanvasEngine';
import { handleSelectDown, handleSelectDrag, handleSelectUp } from './SelectHandlers';
import { performCut } from './CutHandler';
import { cancelPendingAction } from './PendingAction';
import { trySmartJoin } from './SmartJoin';

export interface DrawStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  polygonSides: number;
}

/**
 * Wires Paper.js mouse/keyboard events to the engine's sub-modules.
 */
export function bindMouseHandlers(engine: CanvasEngine, paperTool: paper.Tool) {
  paperTool.onMouseDown = (e: paper.ToolEvent) => onMouseDown(engine, e);
  paperTool.onMouseDrag = (e: paper.ToolEvent) => onMouseDrag(engine, e);
  paperTool.onMouseUp = (e: paper.ToolEvent) => onMouseUp(engine, e);
  paperTool.onMouseMove = (e: paper.ToolEvent) => onMouseMove(engine, e);
  paperTool.onKeyDown = (e: paper.KeyEvent) => onKeyDown(engine, e);
}

function onMouseDown(e: CanvasEngine, event: paper.ToolEvent) {
  const point = e.snapMgr.snapPoint(event.point);

  const nativeDown = (event as unknown as { event: MouseEvent }).event;
  if (nativeDown.button === 2 || nativeDown.button === 1 || e.currentTool === 'pan') {
    e.isPanning = true;
    e.lastPanPoint = event.point;
    e.canvas.style.cursor = 'grabbing';
    return;
  }

  switch (e.currentTool) {
    case 'select': handleSelectDown(e, event, point); break;
    case 'line': e.tools.drawStartPoint = point; break;
    case 'polyline': {
      const item = e.tools.handlePolylineDown(point);
      if (item) { e.pushUndoState(); e.autoSelect(item); }
      break;
    }
    case 'arc': e.tools.drawStartPoint = point; break;
    case 'circle': case 'ellipse': case 'rectangle': case 'polygon':
      e.tools.drawStartPoint = point; break;
    case 'dot': {
      e.pushUndoState();
      const dot = e.tools.handleDotDown(point, e.drawStyle);
      e.autoSelect(dot);
      break;
    }
    case 'measure': {
      const mpt = e.snapMgr.snapPointForMeasure(event.point, e.measureSnapMode);
      e.tools.clearMeasure();
      e.tools.measureStartPoint = mpt;
      break;
    }
    case 'cut': e.tools.drawStartPoint = point; break;
    case 'text': e.tools.drawStartPoint = point; break;
  }
}

function onMouseDrag(e: CanvasEngine, event: paper.ToolEvent) {
  const point = e.snapMgr.snapPoint(event.point);
  if (e.isPanning) {
    const delta = event.point.subtract(e.lastPanPoint!);
    e.scope.view.center = e.scope.view.center.subtract(delta);
    return;
  }
  const s = e.drawStyle;
  switch (e.currentTool) {
    case 'select': handleSelectDrag(e, event, point); break;
    case 'line': e.tools.showLinePreview(point, s); break;
    case 'arc': e.tools.showArcPreview(point, s); break;
    case 'circle': e.tools.showCirclePreview(point, s); break;
    case 'ellipse': e.tools.showEllipsePreview(point, s); break;
    case 'rectangle': e.tools.showRectanglePreview(point, s); break;
    case 'polygon': e.tools.showPolygonPreview(point, s); break;
    case 'measure': {
      const mpt = e.snapMgr.snapPointForMeasure(event.point, e.measureSnapMode);
      e.tools.showMeasure(mpt);
      break;
    }
    case 'cut': e.tools.showCutPreview(point); break;
    case 'text': e.tools.showTextPreview(point); break;
  }
}

function onMouseUp(e: CanvasEngine, event: paper.ToolEvent) {
  const point = e.snapMgr.snapPoint(event.point);
  e.snapMgr.clearSmartGuides();
  if (e.isPanning) {
    e.isPanning = false;
    e.lastPanPoint = null;
    e.canvas.style.cursor = e.currentTool === 'select' ? 'default' : e.currentTool === 'pan' ? 'grab' : 'crosshair';
    return;
  }
  const s = e.drawStyle;
  let item: paper.Item | null = null;
  switch (e.currentTool) {
    case 'select': handleSelectUp(e); return;
    case 'line': item = e.tools.commitLine(point, s); break;
    case 'arc': item = e.tools.commitArc(point, s); break;
    case 'circle': item = e.tools.commitCircle(point, s); break;
    case 'ellipse': item = e.tools.commitEllipse(point, s); break;
    case 'rectangle': item = e.tools.commitRectangle(point, s); break;
    case 'polygon': item = e.tools.commitPolygon(point, s); break;
    case 'measure': {
      const mpt = e.snapMgr.snapPointForMeasure(event.point, e.measureSnapMode);
      const mi = e.tools.commitMeasure(mpt, e.strokeColor);
      if (mi) { e.pushUndoState(); e.autoSelect(mi); }
      return;
    }
    case 'cut': {
      performCut(e, point);
      e.tools.clearPreview();
      e.tools.drawStartPoint = null;
      return;
    }
    case 'text': item = e.tools.commitText(point, s); break;
  }
  if (item) {
    const joined = trySmartJoin(e, item);
    e.pushUndoState();
    e.autoSelect(joined ?? item);
  }
}

function onMouseMove(e: CanvasEngine, event: paper.ToolEvent) {
  if (e.currentTool !== 'select' && e.currentTool !== 'pan' || e.pendingAction) {
    e.snapMgr.snapPoint(event.point);
  }
  if (e.currentTool === 'polyline' && e.tools.polylinePoints.length > 0) {
    const point = e.snapMgr.snapPoint(event.point);
    e.tools.showPolylinePreview(point, e.drawStyle);
  }
}

function onKeyDown(e: CanvasEngine, event: paper.KeyEvent) {
  const active = document.activeElement;
  const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;

  if (event.key === 'escape') {
    if (isInput) { (active as HTMLElement).blur(); return; }
    cancelPendingAction(e);
    e.tools.clearPreview();
    e.tools.clearMeasure();
    e.tools.measureStartPoint = null;
    e.tools.drawStartPoint = null;
    e.tools.finishPolyline(false, e.drawStyle);
    e.selection.deselectAll();
  }
  if ((event.key === 'delete' || event.key === 'backspace') && !isInput) {
    e.deleteSelected();
  }
  const nativeKey = (event as unknown as { event?: KeyboardEvent }).event;
  if (event.key === 'd' && nativeKey?.metaKey && !isInput) {
    nativeKey?.preventDefault();
    e.duplicateSelected();
  }
}
