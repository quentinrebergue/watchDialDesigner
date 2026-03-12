import { Eye, EyeOff, Lock, Unlock, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store';
import { Panel } from './Panel';

export function LayersPanel() {
  const {
    layers, activeLayerId,
    addLayer, removeLayer,
    toggleLayerVisibility, toggleLayerLock,
    setActiveLayer, renameLayer,
    moveLayerUp, moveLayerDown,
  } = useAppStore();

  return (
    <Panel title="Layers" action={<button onClick={() => addLayer(`Layer ${layers.length + 1}`)} className="text-gray-400 hover:text-gray-600"><Plus size={14} /></button>}>
      <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto panel-scroll">
        {layers.map((layer) => (
          <div
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer ${
              activeLayerId === layer.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'hover:bg-gray-50 text-gray-600'
            }`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
              className="text-gray-400 hover:text-gray-600"
            >
              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id); }}
              className="text-gray-400 hover:text-gray-600"
            >
              {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
            <span
              className="flex-1 truncate"
              onDoubleClick={(e) => {
                const name = prompt('Layer name:', layer.name);
                if (name) renameLayer(layer.id, name);
                e.stopPropagation();
              }}
            >
              {layer.name}
            </span>
            {layers.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }}
                  disabled={layers.indexOf(layer) === 0}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ChevronUp size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }}
                  disabled={layers.indexOf(layer) === layers.length - 1}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ChevronDown size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                  className="text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={10} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
