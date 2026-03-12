import type { CanvasEngine } from '../CanvasEngine';

/**
 * If the new item is an open path and one of its endpoints touches
 * the endpoint of another open path on the draw layer, join them.
 * Returns the joined path, or null if no join happened.
 */
export function trySmartJoin(engine: CanvasEngine, newItem: paper.Item): paper.Item | null {
  if (!(newItem instanceof paper.Path)) return null;
  if (newItem.closed) return null;
  if (newItem.segments.length < 2) return null;

  const threshold = 1; // project-coord tolerance
  const newFirst = newItem.firstSegment.point;
  const newLast = newItem.lastSegment.point;

  for (const child of [...engine.drawLayer.children]) {
    if (child === newItem) continue;
    if (!(child instanceof paper.Path)) continue;
    if (child.closed) continue;
    if (child.segments.length < 2) continue;
    if (child.data?.isDot) continue;

    const otherFirst = child.firstSegment.point;
    const otherLast = child.lastSegment.point;

    let match = false;

    if (newLast.getDistance(otherFirst) < threshold) {
      match = true;
    } else if (newFirst.getDistance(otherLast) < threshold) {
      match = true;
    } else if (newLast.getDistance(otherLast) < threshold) {
      child.reverse();
      match = true;
    } else if (newFirst.getDistance(otherFirst) < threshold) {
      newItem.reverse();
      match = true;
    }

    if (match) {
      const joined = newItem.join(child);
      return joined ?? newItem;
    }
  }

  return null;
}
