import paper from 'paper';
import type { SelectionManager } from '../SelectionManager';

/** Check if an item is eligible for boolean operations. */
export function isBooleanEligible(item: paper.Item): boolean {
  if (item instanceof paper.PointText) return false;
  if (item.data?.isComponentInstance) return false;
  if (item instanceof paper.Group && item.children?.some((c: paper.Item) => c instanceof paper.PointText)) return false;
  if (item.data?.isDot) return false;
  return true;
}

/** Returns true when the given items can perform boolean operations. */
export function canPerformBoolean(items: paper.Item[]): boolean {
  if (items.length !== 2) return false;
  return items.every((item) => isBooleanEligible(item));
}

/** Convert an item to a Path suitable for boolean operations. */
function itemToPath(item: paper.Item): paper.PathItem | null {
  if (item instanceof paper.Path) return item;
  if (item instanceof paper.CompoundPath) return item;
  if (item instanceof paper.Group) {
    const paths = item.children.filter((c): c is paper.Path => c instanceof paper.Path);
    if (paths.length === 0) return null;
    let result: paper.PathItem = paths[0];
    for (let i = 1; i < paths.length; i++) {
      result = result.unite(paths[i]);
    }
    return result;
  }
  return null;
}

/** Perform a boolean operation between the two selected items. */
function performBoolean(sm: SelectionManager, op: 'subtract' | 'unite' | 'intersect', pushUndo: () => void) {
  if (!canPerformBoolean(sm.selectedItems)) return;
  sm.ctx.drawLayer.activate();

  const baseItem = sm.selectedItems[0];
  const toolItem = sm.selectedItems[1];

  const basePath = itemToPath(baseItem);
  const toolPath = itemToPath(toolItem);
  if (!basePath || !toolPath) return;

  pushUndo();

  let result: paper.PathItem;
  switch (op) {
    case 'subtract': result = basePath.subtract(toolPath); break;
    case 'unite': result = basePath.unite(toolPath); break;
    case 'intersect': result = basePath.intersect(toolPath); break;
  }

  result.strokeColor = baseItem.strokeColor?.clone() ?? null;
  result.fillColor = baseItem.fillColor?.clone() ?? null;
  result.strokeWidth = baseItem.strokeWidth;

  baseItem.remove();
  toolItem.remove();

  sm.ctx.drawLayer.addChild(result);
  sm.deselectAll();
  sm.selectItem(result);
}

export function booleanSubtract(sm: SelectionManager, pushUndo: () => void) { performBoolean(sm, 'subtract', pushUndo); }
export function booleanUnite(sm: SelectionManager, pushUndo: () => void) { performBoolean(sm, 'unite', pushUndo); }
export function booleanIntersect(sm: SelectionManager, pushUndo: () => void) { performBoolean(sm, 'intersect', pushUndo); }

// ── Radial clone / mirror ────────────────────────────────

export function radialClone(sm: SelectionManager, count: number, pushUndo: () => void) {
  if (sm.selectedItems.length === 0) return;
  pushUndo();
  sm.ctx.drawLayer.activate();

  const dotItem = sm.selectedItems.find((item) => item.data?.isDot);
  const center = dotItem ? dotItem.bounds.center : new sm.ctx.scope.Point(0, 0);

  const itemsToClone = dotItem
    ? sm.selectedItems.filter((item) => item !== dotItem)
    : sm.selectedItems;

  const angleStep = 360 / count;
  for (let i = 1; i < count; i++) {
    itemsToClone.forEach((item) => {
      const clone = item.clone();
      clone.rotate(angleStep * i, center);
    });
  }
}

export function mirrorHorizontal(sm: SelectionManager, pushUndo: () => void) {
  if (sm.selectedItems.length === 0) return;
  pushUndo();
  sm.ctx.drawLayer.activate();
  sm.selectedItems.forEach((item) => {
    const clone = item.clone();
    clone.scale(-1, 1, new sm.ctx.scope.Point(0, 0));
  });
}

export function mirrorVertical(sm: SelectionManager, pushUndo: () => void) {
  if (sm.selectedItems.length === 0) return;
  pushUndo();
  sm.ctx.drawLayer.activate();
  sm.selectedItems.forEach((item) => {
    const clone = item.clone();
    clone.scale(1, -1, new sm.ctx.scope.Point(0, 0));
  });
}
