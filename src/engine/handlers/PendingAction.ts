import type { CanvasEngine } from '../CanvasEngine';

export interface PendingActionState {
  type: 'centerH' | 'centerV' | 'radialClone';
  items: paper.Item[];
  count?: number;
}

export function cancelPendingAction(engine: CanvasEngine) {
  if (engine.pendingAction) {
    engine.pendingAction = null;
    engine.canvas.style.cursor = engine.currentTool === 'select' ? 'default' : 'crosshair';
    engine.onStatusMessage?.(null);
  }
}

export function executePendingAction(engine: CanvasEngine, point: paper.Point) {
  const action = engine.pendingAction;
  if (!action) return;

  engine.pushUndoState();
  const { scope } = engine;

  switch (action.type) {
    case 'centerH':
      action.items.forEach((item) => {
        item.position = new scope.Point(point.x, item.position.y);
      });
      break;
    case 'centerV':
      action.items.forEach((item) => {
        item.position = new scope.Point(item.position.x, point.y);
      });
      break;
    case 'radialClone': {
      const count = action.count ?? 12;
      const angleStep = 360 / count;
      for (let i = 1; i < count; i++) {
        action.items.forEach((item) => {
          const clone = item.clone();
          clone.rotate(angleStep * i, point);
        });
      }
      break;
    }
  }

  engine.pendingAction = null;
  engine.canvas.style.cursor = 'default';
  engine.onStatusMessage?.(null);
  engine.selection.updateSelectionHighlight();
}

export function startCenterH(engine: CanvasEngine) {
  if (engine.selection.selectedItems.length === 0) return;
  engine.pendingAction = {
    type: 'centerH',
    items: [...engine.selection.selectedItems],
  };
  engine.currentTool = 'select';
  engine.canvas.style.cursor = 'crosshair';
  engine.onToolChange?.('select');
  engine.onStatusMessage?.('Click a reference point to center horizontally');
}

export function startCenterV(engine: CanvasEngine) {
  if (engine.selection.selectedItems.length === 0) return;
  engine.pendingAction = {
    type: 'centerV',
    items: [...engine.selection.selectedItems],
  };
  engine.currentTool = 'select';
  engine.canvas.style.cursor = 'crosshair';
  engine.onToolChange?.('select');
  engine.onStatusMessage?.('Click a reference point to center vertically');
}

export function startRadialClone(engine: CanvasEngine, count: number) {
  if (engine.selection.selectedItems.length === 0) return;
  const items = engine.selection.selectedItems.filter((item) => !item.data?.isDot);
  if (items.length === 0) return;
  engine.pendingAction = {
    type: 'radialClone',
    items,
    count,
  };
  engine.currentTool = 'select';
  engine.canvas.style.cursor = 'crosshair';
  engine.onToolChange?.('select');
  engine.onStatusMessage?.('Click a pivot point for radial clone');
}
