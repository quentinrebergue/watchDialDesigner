import { Minus, Plus } from 'lucide-react';
import { useAppStore } from '../store';
import { getEngine } from './Sketch';

export function StatusBar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const zoom = useAppStore((s) => s.zoom);
  const selectedCount = useAppStore((s) => s.selectedCount);
  const statusMessage = useAppStore((s) => s.statusMessage);

  const toolLabels: Record<string, string> = {
    select: 'Select',
    line: 'Line',
    polyline: 'Polyline',
    arc: 'Arc (3-point)',
    circle: 'Circle',
    ellipse: 'Ellipse',
    rectangle: 'Rectangle',
    polygon: 'Polygon',
    dot: 'Dot',
    text: 'Text',
    measure: 'Measure',
    cut: 'Cut',
    pan: 'Pan',
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-7 bg-white/90 backdrop-blur-md border-t border-gray-200/70 flex items-center px-4 gap-4 text-[11px] text-gray-500 z-20">
      <span className="font-medium text-gray-700">{toolLabels[activeTool] ?? activeTool}</span>
      {statusMessage && (
        <span className="text-orange-600 font-medium animate-pulse">{statusMessage}</span>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => getEngine()?.zoomOut()}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
          title="Zoom out"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => getEngine()?.resetZoom()}
          className="hover:text-blue-600 transition-colors cursor-pointer min-w-[40px] text-center"
          title="Click to reset zoom to 100%"
        >
          {(zoom * 100).toFixed(0)}%
        </button>
        <button
          onClick={() => getEngine()?.zoomIn()}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
          title="Zoom in"
        >
          <Plus size={12} />
        </button>
      </div>
      {selectedCount > 0 && (
        <span className="text-blue-600">{selectedCount} selected</span>
      )}
      <div className="flex-1" />
      <button
        onClick={() => getEngine()?.fitToView()}
        className="hover:text-blue-600 transition-colors cursor-pointer"
        title="Fit to View"
      >
        Fit View
      </button>
    </div>
  );
}
