import { useAppStore } from '../../store';
import { Panel, Field } from './Panel';

export function GridPanel() {
  const { showGrid, setShowGrid, gridSettings, setGridSettings } = useAppStore();

  return (
    <Panel title="Grid">
      {/* Polar section */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-[10px] text-gray-500">
          <input
            type="checkbox"
            checked={gridSettings.showPolar}
            onChange={(e) => { setGridSettings({ showPolar: e.target.checked }); if (!showGrid) setShowGrid(true); }}
            className="rounded"
          />
          Polar grid
        </label>
      </div>
      {gridSettings.showPolar && showGrid && (
        <>
          <Field label="Circle spacing (mm)">
            <input
              type="number"
              value={gridSettings.polarCircleSpacing}
              onChange={(e) => setGridSettings({ polarCircleSpacing: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
              step={0.5}
              min={0.1}
              className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </Field>
          <Field label="Angle spacing (°)">
            <input
              type="number"
              value={gridSettings.polarAngleSpacing}
              onChange={(e) => setGridSettings({ polarAngleSpacing: Math.max(1, parseFloat(e.target.value) || 1) })}
              step={1}
              min={1}
              max={90}
              className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </Field>
        </>
      )}

      {/* Separator */}
      <div className="h-px bg-gray-200" />

      {/* Cartesian section */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-[10px] text-gray-500">
          <input
            type="checkbox"
            checked={gridSettings.showCartesian}
            onChange={(e) => { setGridSettings({ showCartesian: e.target.checked }); if (!showGrid) setShowGrid(true); }}
            className="rounded"
          />
          Cartesian grid
        </label>
      </div>
      {gridSettings.showCartesian && showGrid && (
        <Field label="Grid spacing (mm)">
          <input
            type="number"
            value={gridSettings.cartesianSpacing}
            onChange={(e) => setGridSettings({ cartesianSpacing: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
            step={0.5}
            min={0.1}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </Field>
      )}
    </Panel>
  );
}
