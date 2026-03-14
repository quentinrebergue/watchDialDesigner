import paper from 'paper';
import type { CanvasEngine } from '../CanvasEngine';
import { executePendingAction } from './PendingAction';

/**
 * Select‑tool sub‑handlers: mouse down / drag / up + marquee selection.
 */

/** Walk up the parent chain to find the top-level item within the draw layer. */
export function resolveTopItem(engine: CanvasEngine, item: paper.Item): paper.Item {
  let current = item;
  while (current.parent && current.parent !== engine.drawLayer) {
    current = current.parent;
  }
  return current;
}

export function handleSelectDown(engine: CanvasEngine, event: paper.ToolEvent, point: paper.Point) {
  engine.drawLayer.activate();

  // Pending point-pick action (center H/V, radial clone)
  if (engine.pendingAction) {
    const snapped = engine.snapMgr.snapPoint(event.point);
    executePendingAction(engine, snapped);
    return;
  }

  // Replace mode
  if (engine.selection.replaceSource) {
    const hitResult = engine.drawLayer.hitTest(event.point, {
      segments: true, stroke: true, fill: true,
      tolerance: 5 / engine.scope.view.zoom,
    });
    if (hitResult?.item) {
      const topItem = resolveTopItem(engine, hitResult.item);
      if (topItem !== engine.selection.replaceSource) {
        engine.selection.replaceItemWith(topItem, engine.selection.replaceSource, () => engine.pushUndoState());
      }
    }
    engine.selection.clearReplaceMode();
    return;
  }

  const hitResult = engine.drawLayer.hitTest(event.point, {
    segments: true, stroke: true, fill: true,
    tolerance: 5 / engine.scope.view.zoom,
  });

  if (hitResult?.item) {
    const topItem = resolveTopItem(engine, hitResult.item);
    const shiftKey = (event as unknown as { event?: MouseEvent }).event?.shiftKey;
    if (shiftKey && engine.selection.selectedItems.includes(topItem)) {
      engine.selection.selectedItems = engine.selection.selectedItems.filter((i) => i !== topItem);
      topItem.selected = false;
      engine.selection.updateSelectionHighlight();
    } else {
      engine.selection.selectItem(topItem, shiftKey);
    }

    // Check if clicking near a segment point for vertex dragging
    engine.selection.dragSegment = null;
    if (engine.selection.selectedItems.length === 1 && hitResult.type === 'segment' && hitResult.segment) {
      const item = engine.selection.selectedItems[0];
      if (item instanceof paper.Path && !item.data?.isDot && !item.data?.isTextArc) {
        engine.selection.dragSegment = hitResult.segment;
      }
    }

    engine.selection.isDraggingSelection = true;
    engine.selection.dragStart = point;
  } else {
    engine.selection.deselectAll();
    engine.selection.dragStart = point;
  }
}

export function handleSelectDrag(engine: CanvasEngine, _: paper.ToolEvent, point: paper.Point) {
  if (engine.selection.isDraggingSelection && engine.selection.dragStart) {
    if (engine.selection.dragSegment) {
      // Vertex dragging: move only the grabbed segment point
      engine.selection.dragSegment.point = point;
      engine.selection.updateSelectionHighlight();
    } else {
      // Whole-item dragging
      const delta = point.subtract(engine.selection.dragStart);
      engine.selection.selectedItems.forEach((item) => { item.position = item.position.add(delta); });
    }
    engine.selection.dragStart = point;
    engine.selection.updateSelectionHighlight();
  } else if (engine.selection.dragStart) {
    engine.overlayLayer.activate();
    engine.selection.marquee?.remove();
    const rect = new engine.scope.Rectangle(engine.selection.dragStart, point);
    engine.selection.marquee = new engine.scope.Path.Rectangle(rect);
    engine.selection.marquee.strokeColor = new engine.scope.Color('#2196F3');
    engine.selection.marquee.strokeWidth = 1 / engine.scope.view.zoom;
    engine.selection.marquee.fillColor = new engine.scope.Color(0.13, 0.59, 0.95, 0.1);
    engine.selection.marquee.dashArray = [3 / engine.scope.view.zoom, 3 / engine.scope.view.zoom];
    engine.drawLayer.activate();
  }
}

export function handleSelectUp(engine: CanvasEngine) {
  if (engine.selection.marquee) {
    engine.drawLayer.activate();
    const rect = engine.selection.marquee.bounds;
    engine.drawLayer.children.forEach((item) => {
      if (rect.contains(item.bounds)) {
        engine.selection.selectItem(item, true);
      }
    });
    engine.overlayLayer.activate();
    engine.selection.marquee.remove();
    engine.selection.marquee = null;
    engine.drawLayer.activate();
  }
  if (engine.selection.isDraggingSelection) {
    engine.pushUndoState();
  }
  engine.selection.isDraggingSelection = false;
  engine.selection.dragStart = null;
  engine.selection.dragSegment = null;
}
