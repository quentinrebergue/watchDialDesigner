import { useRef, useEffect, useCallback } from 'react';
import { CanvasEngine } from '../engine/CanvasEngine';
import { useAppStore } from '../store';
import { saveDesign, getAllDesigns, type SavedDesign } from '../designsDB';
import { saveComponent, getAllComponents, type SavedComponent } from '../componentsDB';

// Singleton engine ref so other components can access it
let engineInstance: CanvasEngine | null = null;
export function getEngine(): CanvasEngine | null {
  return engineInstance;
}

export function Sketch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);

  const activeTool = useAppStore((s) => s.activeTool);
  const strokeColor = useAppStore((s) => s.strokeColor);
  const fillColor = useAppStore((s) => s.fillColor);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const diameter = useAppStore((s) => s.diameter);
  const showGrid = useAppStore((s) => s.showGrid);
  const snap = useAppStore((s) => s.snap);
  const gridSettings = useAppStore((s) => s.gridSettings);
  const polygonSides = useAppStore((s) => s.polygonSides);
  const setSelectedCount = useAppStore((s) => s.setSelectedCount);
  const setSelectionProps = useAppStore((s) => s.setSelectionProps);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const setZoom = useAppStore((s) => s.setZoom);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const showCenterPoint = useAppStore((s) => s.showCenterPoint);
  const measureSnapMode = useAppStore((s) => s.measureSnapMode);
  const dialColor = useAppStore((s) => s.dialColor);
  const dialShape = useAppStore((s) => s.dialShape);

  // Initialize engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const engine = new CanvasEngine(canvas);
    engineRef.current = engine;
    engineInstance = engine;

    // Wire callbacks
    engine.onSelectionChange = (count, props) => {
      setSelectedCount(count);
      setSelectionProps(props);
    };
    engine.onPushUndo = (json) => pushUndo(json);
    engine.onZoomChange = (z) => setZoom(z);
    engine.onToolChange = (tool) => useAppStore.getState().setActiveTool(tool);
    engine.onStatusMessage = (msg) => useAppStore.getState().setStatusMessage(msg);

    // Resize handler
    const onResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      engine.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      engine.destroy();
      engineRef.current = null;
      engineInstance = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync tool
  useEffect(() => {
    engineRef.current?.setTool(activeTool);
  }, [activeTool]);

  // Sync style
  useEffect(() => { engineRef.current?.setStrokeColor(strokeColor); }, [strokeColor]);
  useEffect(() => { engineRef.current?.setFillColor(fillColor); }, [fillColor]);
  useEffect(() => { engineRef.current?.setStrokeWidth(strokeWidth); }, [strokeWidth]);
  useEffect(() => { engineRef.current?.setPolygonSides(polygonSides); }, [polygonSides]);

  // Sync dial / grid / snap
  useEffect(() => { engineRef.current?.setDiameter(diameter); }, [diameter]);
  useEffect(() => { engineRef.current?.setShowGrid(showGrid); }, [showGrid]);
  useEffect(() => { engineRef.current?.setGridSettings(gridSettings); }, [gridSettings]);
  useEffect(() => { engineRef.current?.setSnap(snap); }, [snap]);

  // Sync dial appearance
  useEffect(() => { engineRef.current?.setDialColor(dialColor); }, [dialColor]);
  useEffect(() => { engineRef.current?.setDialShape(dialShape); }, [dialShape]);

  // Sync center point
  useEffect(() => { engineRef.current?.setShowCenterPoint(showCenterPoint); }, [showCenterPoint]);

  // Sync measure snap mode
  useEffect(() => { engineRef.current?.setMeasureSnapMode(measureSnapMode); }, [measureSnapMode]);

  // Keyboard shortcuts (undo/redo, tool switches)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;

      // Undo/Redo always work
      if (meta && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const entry = undo();
        if (entry) engineRef.current?.restoreFromJSON(entry.json);
        return;
      }
      if (meta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const entry = redo();
        if (entry) engineRef.current?.restoreFromJSON(entry.json);
        return;
      }
      if (meta && e.key === 'c') {
        e.preventDefault();
        engineRef.current?.copySelected();
        return;
      }
      if (meta && e.key === 'v') {
        e.preventDefault();
        engineRef.current?.paste();
        return;
      }
      if (meta && e.key === 's') {
        e.preventDefault();
        const engine = engineRef.current;
        const json = engine?.saveProject();
        if (!json || !engine) return;

        const docType = useAppStore.getState().documentType;
        const ext = docType === 'component' ? '.wdc.json' : '.wdd.json';

        // Download file
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watch-dial${ext}`;
        a.click();
        URL.revokeObjectURL(url);

        if (docType === 'component') {
          const svgPreview = engine.exportDrawingSVG();
          const comp: SavedComponent = {
            id: crypto.randomUUID(),
            name: `Component ${new Date().toLocaleString()}`,
            json,
            svgPreview,
            createdAt: Date.now(),
          };
          saveComponent(comp).then(() =>
            getAllComponents().then((components) =>
              useAppStore.getState().setSavedComponents(components)
            )
          );
        } else {
          const svgPreview = engine.exportDrawingSVG();
          const design: SavedDesign = {
            id: crypto.randomUUID(),
            name: `Design ${new Date().toLocaleString()}`,
            json,
            svgPreview,
            createdAt: Date.now(),
          };
          saveDesign(design).then(() =>
            getAllDesigns().then((designs) =>
              useAppStore.getState().setSavedDesigns(designs)
            )
          );
        }
        return;
      }
      if (meta && e.key === 'o') {
        e.preventDefault();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.wdd.json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const data = reader.result as string;
            const diameter = engineRef.current?.loadProject(data);
            if (diameter) useAppStore.getState().setDiameter(diameter);
          };
          reader.readAsText(file);
        };
        input.click();
        return;
      }

      // Skip tool shortcuts when focused on an input
      if (isInput) return;

      // Tool shortcuts
      if (!meta && !e.shiftKey) {
        const { setActiveTool } = useAppStore.getState();
        switch (e.key) {
          case 'v': setActiveTool('select'); break;
          case 'l': setActiveTool('line'); break;
          case 'p': setActiveTool('polyline'); break;
          case 'a': setActiveTool('arc'); break;
          case 'c': setActiveTool('circle'); break;
          case 'e': setActiveTool('ellipse'); break;
          case 'r': setActiveTool('rectangle'); break;
          case 'g': setActiveTool('polygon'); break;
          case 'd': setActiveTool('dot'); break;
          case 't': setActiveTool('text'); break;
          case 'm': setActiveTool('measure'); break;
          case 'x': setActiveTool('cut'); break;
          case 'h': setActiveTool('pan'); break;
        }
      }
    },
    [undo, redo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 right-0 bottom-0 top-8 w-full"
      style={{ cursor: activeTool === 'select' ? 'default' : activeTool === 'pan' ? 'grab' : 'crosshair', height: 'calc(100% - 2rem)' }}
    />
  );
}
