import { useAppStore, type DialShape } from '../../store';

export function DialSection() {
  const { diameter, setDiameter, dialColor, setDialColor, dialShape, setDialShape } = useAppStore();

  const shapes: { id: DialShape; label: string }[] = [
    { id: 'circle', label: 'Circle' },
    { id: 'square', label: 'Square' },
    { id: 'cushion', label: 'Cushion' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Dial</h4>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 shrink-0">Diameter (mm)</span>
        <input
          type="number"
          value={diameter}
          onChange={(e) => setDiameter(Math.max(1, parseFloat(e.target.value) || 1))}
          step={0.5}
          min={1}
          className="w-20 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 shrink-0">Color</span>
        <input
          type="color"
          value={dialColor}
          onChange={(e) => setDialColor(e.target.value)}
          className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 shrink-0">Shape</span>
        <div className="flex gap-0.5">
          {shapes.map((s) => (
            <button
              key={s.id}
              onClick={() => setDialShape(s.id)}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                dialShape === s.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
