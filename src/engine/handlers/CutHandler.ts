import paper from 'paper';
import type { CanvasEngine } from '../CanvasEngine';

/**
 * Cut tool logic: line-based cutting of paths on the draw layer.
 * Handles both open-path splitting and closed-path 2-point splitting.
 */

export interface PendingCutData {
  points: paper.Point[];
  markers: paper.Item[];
}

export function clearPendingCuts(pendingCuts: Map<number, PendingCutData>) {
  for (const [, data] of pendingCuts) {
    data.markers.forEach((m) => m.remove());
  }
  pendingCuts.clear();
}

export function performCut(engine: CanvasEngine, endPoint: paper.Point) {
  const startPoint = engine.tools.drawStartPoint;
  if (!startPoint || startPoint.getDistance(endPoint) < 1) return;

  const { scope } = engine;
  engine.drawLayer.activate();

  const cutLine = new scope.Path.Line(startPoint, endPoint);

  const itemIntersections = new Map<paper.Path, paper.Point[]>();
  for (const item of [...engine.drawLayer.children]) {
    if (item instanceof paper.PointText) continue;
    if (item.data?.isComponentInstance) continue;
    if (item.data?.isDot) continue;
    if (item instanceof paper.Group && item.children?.some((c: paper.Item) => c instanceof paper.PointText)) continue;

    if (item instanceof paper.Path) {
      const ixs = cutLine.getIntersections(item);
      if (ixs.length > 0) {
        itemIntersections.set(item, ixs.map((ix) => ix.point));
      }
    }
  }

  cutLine.remove();
  if (itemIntersections.size === 0) return;

  let didSplit = false;

  for (const [path, newPoints] of itemIntersections) {
    const itemId = path.id;
    const isOpen = !path.closed;

    if (isOpen) {
      if (!didSplit) { engine.pushUndoState(); didSplit = true; }
      splitOpenPath(path, newPoints);
      const pending = engine.pendingCuts.get(itemId);
      if (pending) {
        pending.markers.forEach((m) => m.remove());
        engine.pendingCuts.delete(itemId);
      }
    } else {
      const pending = engine.pendingCuts.get(itemId) ?? { points: [], markers: [] };
      const allPoints = [...pending.points, ...newPoints];

      if (allPoints.length >= 2) {
        if (!didSplit) { engine.pushUndoState(); didSplit = true; }
        splitClosedPath(engine, path, allPoints[0], allPoints[1]);
        pending.markers.forEach((m) => m.remove());
        engine.pendingCuts.delete(itemId);
      } else {
        for (const pt of newPoints) {
          engine.overlayLayer.activate();
          const marker = new scope.Path.Circle(pt, 3 / scope.view.zoom);
          marker.fillColor = new scope.Color('#e53935');
          marker.strokeColor = null;
          pending.markers.push(marker);
          engine.drawLayer.activate();
        }
        pending.points = allPoints;
        engine.pendingCuts.set(itemId, pending);
      }
    }
  }

  if (didSplit) engine.selection.deselectAll();
}

function splitOpenPath(path: paper.Path, cutPoints: paper.Point[]) {
  const style = {
    strokeColor: path.strokeColor?.clone() ?? null,
    fillColor: path.fillColor?.clone() ?? null,
    strokeWidth: path.strokeWidth,
  };

  const sorted = cutPoints
    .map((pt) => ({ point: pt, offset: path.getNearestLocation(pt).offset }))
    .sort((a, b) => b.offset - a.offset);

  for (const { point } of sorted) {
    const loc = path.getNearestLocation(point);
    const piece = path.splitAt(loc);
    if (piece && piece !== path) {
      piece.strokeColor = style.strokeColor;
      piece.fillColor = style.fillColor;
      piece.strokeWidth = style.strokeWidth;
    }
  }
}

function splitClosedPath(_engine: CanvasEngine, path: paper.Path, point1: paper.Point, point2: paper.Point) {
  const style = {
    strokeColor: path.strokeColor?.clone() ?? null,
    fillColor: path.fillColor?.clone() ?? null,
    strokeWidth: path.strokeWidth,
  };

  const loc1 = path.getNearestLocation(point1);
  const loc2 = path.getNearestLocation(point2);

  let firstLoc: paper.CurveLocation;
  let secondPoint: paper.Point;
  if (loc1.offset <= loc2.offset) {
    firstLoc = loc1;
    secondPoint = point2;
  } else {
    firstLoc = loc2;
    secondPoint = point1;
  }

  path.splitAt(firstLoc);
  const newLoc = path.getNearestLocation(secondPoint);
  const secondPath = path.splitAt(newLoc);

  path.strokeColor = style.strokeColor;
  path.fillColor = style.fillColor;
  path.strokeWidth = style.strokeWidth;

  if (secondPath && secondPath !== path) {
    secondPath.strokeColor = style.strokeColor;
    secondPath.fillColor = style.fillColor;
    secondPath.strokeWidth = style.strokeWidth;
  }
}
