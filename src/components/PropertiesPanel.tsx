import { LayersPanel } from './panels/LayersPanel';
import { SelectionPanel } from './panels/SelectionPanel';

export function PropertiesPanel() {
  return (
    <div className="absolute right-3 top-11 bottom-3 w-64 flex flex-col gap-2 z-20 overflow-y-auto panel-scroll">
      <LayersPanel />
      <SelectionPanel />
    </div>
  );
}
