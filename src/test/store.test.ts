import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to defaults between tests
    useAppStore.setState({
      activeTool: 'select',
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 0.5,
      diameter: 28.5,
      showGrid: true,
      selectedCount: 0,
      selectionProps: null,
      showCenterPoint: false,
      polygonSides: 6,
      zoom: 1,
    });
  });

  it('sets active tool', () => {
    useAppStore.getState().setActiveTool('circle');
    expect(useAppStore.getState().activeTool).toBe('circle');
  });

  it('sets diameter', () => {
    useAppStore.getState().setDiameter(32);
    expect(useAppStore.getState().diameter).toBe(32);
  });

  it('updates grid settings partially', () => {
    useAppStore.getState().setGridSettings({ polarCircleSpacing: 2.5 });
    const gs = useAppStore.getState().gridSettings;
    expect(gs.polarCircleSpacing).toBe(2.5);
    // Ensure other values remain unchanged
    expect(gs.polarAngleSpacing).toBe(6);
  });

  it('updates snap settings partially', () => {
    useAppStore.getState().setSnap({ mode: 'angular' });
    expect(useAppStore.getState().snap.mode).toBe('angular');
    // Other snap fields unchanged
    expect(useAppStore.getState().snap.angularStep).toBe(6);
  });

  it('manages undo/redo stack', () => {
    const { pushUndo } = useAppStore.getState();
    pushUndo('{"state":"A"}');
    pushUndo('{"state":"B"}');

    expect(useAppStore.getState().undoStack).toHaveLength(2);

    const entry = useAppStore.getState().undo();
    expect(entry).toBeDefined();
    expect(useAppStore.getState().undoStack).toHaveLength(1);
    expect(useAppStore.getState().redoStack).toHaveLength(1);

    const redone = useAppStore.getState().redo();
    expect(redone).toBeDefined();
    expect(useAppStore.getState().redoStack).toHaveLength(0);
  });

  it('adds and removes layers', () => {
    const initialCount = useAppStore.getState().layers.length;
    useAppStore.getState().addLayer('Test Layer');
    expect(useAppStore.getState().layers).toHaveLength(initialCount + 1);

    const newLayer = useAppStore.getState().layers[useAppStore.getState().layers.length - 1];
    expect(newLayer.name).toBe('Test Layer');

    useAppStore.getState().removeLayer(newLayer.id);
    expect(useAppStore.getState().layers).toHaveLength(initialCount);
  });

  it('toggles layer visibility and lock', () => {
    const layerId = useAppStore.getState().layers[0].id;

    useAppStore.getState().toggleLayerVisibility(layerId);
    expect(useAppStore.getState().layers[0].visible).toBe(false);

    useAppStore.getState().toggleLayerLock(layerId);
    expect(useAppStore.getState().layers[0].locked).toBe(true);
  });

  it('sets style properties', () => {
    useAppStore.getState().setStrokeColor('#ff0000');
    useAppStore.getState().setFillColor('#00ff00');
    useAppStore.getState().setStrokeWidth(2);

    expect(useAppStore.getState().strokeColor).toBe('#ff0000');
    expect(useAppStore.getState().fillColor).toBe('#00ff00');
    expect(useAppStore.getState().strokeWidth).toBe(2);
  });

  it('sets selection properties', () => {
    useAppStore.getState().setSelectedCount(3);
    expect(useAppStore.getState().selectedCount).toBe(3);

    useAppStore.getState().setSelectionProps({
      x: 10, y: 20,
      width: 30, height: 40,
      rotation: 45,
      isText: false,
      textContent: '',
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 0.5,
      textAlignH: 'center',
      textAlignV: 'center',
      canBoolean: false,
    });

    expect(useAppStore.getState().selectionProps?.x).toBe(10);
    expect(useAppStore.getState().selectionProps?.rotation).toBe(45);
  });
});
