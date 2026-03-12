import { useAppStore } from '../../store';
import { Panel, Field } from './Panel';

export function DialPanel() {
  const { diameter, setDiameter, zoom } = useAppStore();

  return (
    <Panel title="Dial">
      <Field label="Diameter (mm)">
        <input
          type="number"
          value={diameter}
          onChange={(e) => setDiameter(Math.max(1, parseFloat(e.target.value) || 1))}
          step={0.5}
          min={1}
          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </Field>
      <Field label="Zoom">
        <span className="text-xs text-gray-500">{(zoom * 100).toFixed(0)}%</span>
      </Field>
    </Panel>
  );
}
