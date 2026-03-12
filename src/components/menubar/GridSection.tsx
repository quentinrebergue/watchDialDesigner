import { useAppStore } from '../../store';

export function GridSection() {
  const { showGrid, setShowGrid, gridSettings, setGridSettings } = useAppStore();

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Grid</h4>

      {/* Polar */}
      <label className="flex items-center gap-1 text-[10px] text-gray-500">
        <input
          type="checkbox"
          checked={gridSettings.showPolar}
          onChange={(e) => { setGridSettings({ showPolar: e.target.checked }); if (!showGrid) setShowGrid(true); }}
          className="rounded"
        />
        Polar grid
      </label>
      {gridSettings.showPolar && showGrid && (
        <div className="flex flex-col gap-1.5 ml-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-500">Circle (mm)</span>
            <input
              type="number"
              value={gridSettings.polarCircleSpacing}
              onChange={(e) => setGridSettings({ polarCircleSpacing: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
              step={0.5}
              min={0.1}
              className="w-16 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-500">Angle (°)</span>
            <input
              type="number"
              value={gridSettings.polarAngleSpacing}
              onChange={(e) => setGridSettings({ polarAngleSpacing: Math.max(1, parseFloat(e.target.value) || 1) })}
              step={1}
              min={1}
              max={90}
              className="w-16 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      <div className="h-px bg-gray-100" />

      {/* Cartesian */}
      <label className="flex items-center gap-1 text-[10px] text-gray-500">
        <input
          type="checkbox"
          checked={gridSettings.showCartesian}
          onChange={(e) => { setGridSettings({ showCartesian: e.target.checked }); if (!showGrid) setShowGrid(true); }}
          className="rounded"
        />
        Cartesian grid
      </label>
      {gridSettings.showCartesian && showGrid && (
        <div className="flex items-center justify-between gap-2 ml-3">
          <span className="text-[10px] text-gray-500">Spacing (mm)</span>
          <input
            type="number"
            value={gridSettings.cartesianSpacing}
            onChange={(e) => setGridSettings({ cartesianSpacing: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
            step={0.5}
            min={0.1}
            className="w-16 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}
    </div>
  );
}
