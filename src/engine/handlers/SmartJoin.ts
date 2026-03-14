import paper from 'paper';
import type { CanvasEngine } from '../CanvasEngine';

/**
 * If the new item is an open path and one of its endpoints touches
 * the endpoint of another open path on the draw layer, join them.
 * Repeats until no more joins are possible (transitive chain joining).
 * Paper.js join() handles endpoint merging and auto-closing natively
 * when given a proper tolerance.
 * Returns the joined path, or null if no join happened.
 */
export function trySmartJoin(engine: CanvasEngine, newItem: paper.Item): paper.Item | null {
  if (!(newItem instanceof paper.Path)) return null;
  if (newItem.closed) return null;
  if (newItem.segments.length < 2) return null;

  const threshold = 5; // project-coord tolerance
  let current: paper.Path = newItem;
  let didJoin = false;

  // Repeatedly scan for joinable neighbors until no more matches
  let found = true;
  while (found) {
    found = false;
    if (current.closed) break;

    const curFirst = current.firstSegment.point;
    const curLast = current.lastSegment.point;

    for (const child of [...engine.drawLayer.children]) {
      if (child === current) continue;
      if (!(child instanceof paper.Path)) continue;
      if (child.closed) continue;
      if (child.segments.length < 2) continue;
      if (child.data?.isDot) continue;

      const otherFirst = child.firstSegment.point;
      const otherLast = child.lastSegment.point;

      const minDist = Math.min(
        curLast.getDistance(otherFirst),
        curFirst.getDistance(otherLast),
        curLast.getDistance(otherLast),
        curFirst.getDistance(otherFirst),
      );

      if (minDist < threshold) {
        current.join(child, threshold);
        didJoin = true;
        found = true;
        break;
      }
    }
  }

  return didJoin ? current : null;
}
