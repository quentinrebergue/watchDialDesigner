import { useAppStore, type SnapMode } from '../../store';
import { Panel, Field } from './Panel';

const snapModes: { value: SnapMode; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'angular', label: 'Angular' },
  { value: 'free', label: 'Free' },
];

export function SnapPanel() {
  const { snap, setSnap, gridSettings, setGridSettings } = useAppStore();

  return (
    <Panel title="Snap">
      <div className="flex items-center gap-1">
        {snapModes.map((m) => (
          <button
            key={m.value}
            onClick={() => setSnap({ mode: m.value })}
            className={`flex-1 text-[10px] px-1.5 py-1 rounded transition-colors ${
              snap.mode === m.value
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-gray-400 -mt-0.5">Points snap is always active</p>
      {snap.mode === 'angular' && (
        <Field label="Angle step">
          <select
            value={snap.angularStep}
            onChange={(e) => setSnap({ angularStep: parseInt(e.target.value) })}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value={1}>1°</option>
            <option value={5}>5°</option>
            <option value={6}>6° (minutes)</option>
            <option value={15}>15°</option>
            <option value={30}>30° (hours)</option>
            <option value={45}>45°</option>
            <option value={90}>90°</option>
          </select>
        </Field>
      )}
      {snap.mode === 'grid' && (
        <Field label="Snap spacing (mm)">
          <input
            type="number"
            value={gridSettings.snapSpacing}
            onChange={(e) => setGridSettings({ snapSpacing: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
            step={0.5}
            min={0.1}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </Field>
      )}
    </Panel>
  );
}
