import { MM_TO_PX, type EngineContext } from '../types';

/**
 * Builds a measure group (line + arrows + distance label).
 * Pure construction function – no side effects on DrawingTools state.
 */
export function buildMeasureGroup(
  ctx: EngineContext,
  start: paper.Point,
  end: paper.Point,
  color: string,
): paper.Group | null {
  const { scope } = ctx;
  const dist = start.getDistance(end);
  if (dist < 0.5) return null;

  const arrowSize = 3;
  const col = new scope.Color(color);
  const lineWidth = 0.5;
  const group = new scope.Group();

  // Main line
  const line = new scope.Path.Line(start, end);
  line.strokeColor = col;
  line.strokeWidth = lineWidth;
  group.addChild(line);

  // Direction vector
  const dir = end.subtract(start).normalize();
  const perp = new scope.Point(-dir.y, dir.x);

  // Arrow at start
  const a1a = start.add(dir.multiply(arrowSize)).add(perp.multiply(arrowSize * 0.4));
  const a1b = start.add(dir.multiply(arrowSize)).subtract(perp.multiply(arrowSize * 0.4));
  const arrow1 = new scope.Path([start, a1a, a1b]);
  arrow1.closed = true;
  arrow1.fillColor = col;
  arrow1.strokeColor = null;
  group.addChild(arrow1);

  // Arrow at end
  const a2a = end.subtract(dir.multiply(arrowSize)).add(perp.multiply(arrowSize * 0.4));
  const a2b = end.subtract(dir.multiply(arrowSize)).subtract(perp.multiply(arrowSize * 0.4));
  const arrow2 = new scope.Path([end, a2a, a2b]);
  arrow2.closed = true;
  arrow2.fillColor = col;
  arrow2.strokeColor = null;
  group.addChild(arrow2);

  // Distance label in mm
  const mm = dist / MM_TO_PX;
  const label = mm.toFixed(2) + ' mm';
  const midPoint = start.add(end).divide(2);
  const offset = perp.multiply(5);
  const text = new scope.PointText(midPoint.add(offset));
  text.content = label;
  text.fillColor = col;
  text.fontSize = 4;
  text.fontFamily = 'Helvetica, Arial, sans-serif';
  text.justification = 'center';
  group.addChild(text);

  return group;
}

/**
 * Show a live measure preview (dashed line + distance label) on the overlay.
 */
export function showMeasurePreview(
  ctx: EngineContext,
  start: paper.Point,
  endPoint: paper.Point,
  setPreview: (item: paper.Item) => void,
): void {
  const { scope } = ctx;
  const dist = start.getDistance(endPoint);
  if (dist < 0.5) return;

  const zoom = scope.view.zoom;
  const red = new scope.Color('#FF0000');

  ctx.overlayLayer.activate();

  const preview = new scope.Path.Line(start, endPoint);
  preview.strokeColor = red;
  preview.strokeWidth = 1.5 / zoom;
  preview.dashArray = [4 / zoom, 4 / zoom];

  const mm = dist / MM_TO_PX;
  const dir = endPoint.subtract(start).normalize();
  const perp = new scope.Point(-dir.y, dir.x);
  const midPoint = start.add(endPoint).divide(2);
  const text = new scope.PointText(midPoint.add(perp.multiply(10 / zoom)));
  text.content = mm.toFixed(2) + ' mm';
  text.fillColor = red;
  text.fontSize = 11 / zoom;
  text.fontFamily = 'Helvetica, Arial, sans-serif';
  text.justification = 'center';

  const group = new scope.Group([preview, text]);
  setPreview(group);

  ctx.drawLayer.activate();
}
