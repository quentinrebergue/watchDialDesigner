import { useAppStore } from '../store';

const drawingTools = new Set(['line', 'polyline', 'arc', 'circle', 'ellipse', 'rectangle', 'polygon', 'dot', 'text']);

export function ToolStylePanel() {
  const activeTool = useAppStore((s) => s.activeTool);
  const strokeColor = useAppStore((s) => s.strokeColor);
  const setStrokeColor = useAppStore((s) => s.setStrokeColor);
  const fillColor = useAppStore((s) => s.fillColor);
  const setFillColor = useAppStore((s) => s.setFillColor);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth);
  const polygonSides = useAppStore((s) => s.polygonSides);
  const setPolygonSides = useAppStore((s) => s.setPolygonSides);

  if (!drawingTools.has(activeTool)) return null;

  return (
    <div className="absolute left-[72px] top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-2.5 flex flex-col gap-2 w-44">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Style</h3>

      {/* Stroke */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-500 w-10 shrink-0">Stroke</span>
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="w-5 h-5 rounded border border-gray-300 cursor-pointer p-0"
        />
        <input
          type="number"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
          step={0.1}
          min={0.1}
          className="w-12 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-[9px] text-gray-400">mm</span>
      </div>

      {/* Fill */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-500 w-10 shrink-0">Fill</span>
        <input
          type="color"
          value={fillColor === 'transparent' ? '#ffffff' : fillColor}
          onChange={(e) => setFillColor(e.target.value)}
          className="w-5 h-5 rounded border border-gray-300 cursor-pointer p-0"
        />
        <button
          onClick={() => setFillColor('transparent')}
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            fillColor === 'transparent'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          None
        </button>
      </div>

      {/* Polygon sides */}
      {activeTool === 'polygon' && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 w-10 shrink-0">Sides</span>
          <input
            type="number"
            value={polygonSides}
            onChange={(e) => setPolygonSides(Math.max(3, Math.min(64, parseInt(e.target.value) || 3)))}
            min={3}
            max={64}
            className="w-12 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}
    </div>
  );
}
