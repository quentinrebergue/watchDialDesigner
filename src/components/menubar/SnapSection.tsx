import { useAppStore } from '../../store';

export function SnapSection() {
  const { snap, setSnap, gridSettings, setGridSettings } = useAppStore();

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Snap</h4>

      <div className="flex items-center gap-1">
        {(['grid', 'angular', 'free'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setSnap({ mode: m })}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              snap.mode === m
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {snap.mode === 'angular' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-500">Angle step</span>
          <select
            value={snap.angularStep}
            onChange={(e) => setSnap({ angularStep: parseInt(e.target.value) })}
            className="w-24 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value={1}>1°</option>
            <option value={5}>5°</option>
            <option value={6}>6° (min)</option>
            <option value={15}>15°</option>
            <option value={30}>30° (hr)</option>
            <option value={45}>45°</option>
            <option value={90}>90°</option>
          </select>
        </div>
      )}

      {snap.mode === 'grid' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-500">Snap spacing (mm)</span>
          <input
            type="number"
            value={gridSettings.snapSpacing}
            onChange={(e) => setGridSettings({ snapSpacing: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
            step={0.5}
            min={0.1}
            className="w-16 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}
    </div>
  );
}
