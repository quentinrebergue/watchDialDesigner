import { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { getEngine } from './Sketch';
import { getAllComponents, deleteComponent } from '../componentsDB';

async function refreshComponents() {
  const components = await getAllComponents();
  useAppStore.getState().setSavedComponents(components);
}

export function ComponentLibrary() {
  const showLibrary = useAppStore((s) => s.showLibrary);
  const savedComponents = useAppStore((s) => s.savedComponents);

  useEffect(() => {
    refreshComponents();
  }, []);

  if (!showLibrary) return null;

  const handlePlace = (comp: (typeof savedComponents)[0]) => {
    getEngine()?.placeComponentInstance(comp.id, comp.json);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteComponent(id);
    await refreshComponents();
  };

  return (
    <div className="absolute left-[72px] top-11 bottom-10 z-20 w-48 flex flex-col">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-2.5 flex flex-col gap-2 h-full">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Components
          </h3>
          <button
            onClick={() => useAppStore.getState().setShowLibrary(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close library"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto panel-scroll flex-1 min-h-0">
          {savedComponents.length === 0 && (
            <p className="text-[10px] text-gray-400 text-center py-6">
              No components yet.<br />
              Select objects and use<br />
              Component → Create from Selection
            </p>
          )}
          {savedComponents.map((comp) => (
            <button
              key={comp.id}
              onClick={() => handlePlace(comp)}
              className="group relative flex flex-col gap-1 p-1.5 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-left shrink-0"
              title={`Place "${comp.name}" on canvas`}
            >
              {/* SVG Preview */}
              <div
                className="w-full h-24 bg-gray-50 rounded overflow-hidden flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: comp.svgPreview }}
              />
              {/* Name */}
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] text-gray-600 truncate flex-1">{comp.name}</span>
                <button
                  onClick={(e) => handleDelete(e, comp.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                  title="Delete component"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
