import { useAppStore, type MeasureSnapMode } from '../store';
import { getEngine } from './Sketch';

const snapModes: { id: MeasureSnapMode; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 'radial', label: 'Radial' },
  { id: 'cartesian', label: 'Cartesian' },
];

export function MeasurePanel() {
  const activeTool = useAppStore((s) => s.activeTool);
  const measureSnapMode = useAppStore((s) => s.measureSnapMode);
  const setMeasureSnapMode = useAppStore((s) => s.setMeasureSnapMode);
  const selectedCount = useAppStore((s) => s.selectedCount);

  if (activeTool !== 'measure') return null;

  const handleMeasureSelected = () => {
    getEngine()?.measureBetweenSelected();
  };

  return (
    <div className="absolute left-[72px] top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-2.5 flex flex-col gap-2 w-44">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Measure</h3>

      {/* Snap mode */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-500">Snap mode</span>
        <div className="flex gap-0.5">
          {snapModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setMeasureSnapMode(mode.id)}
              className={`flex-1 text-[10px] py-1 rounded transition-colors ${
                measureSnapMode === mode.id
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Measure between selection */}
      <div className="border-t border-gray-200 pt-2">
        <button
          onClick={handleMeasureSelected}
          disabled={selectedCount !== 2}
          className="w-full text-[10px] py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={selectedCount !== 2 ? 'Select exactly 2 objects' : 'Measure distance between centers'}
        >
          Measure 2 selected
        </button>
        {selectedCount !== 2 && (
          <p className="text-[9px] text-gray-400 mt-1">Select 2 objects first (V)</p>
        )}
      </div>
    </div>
  );
}
