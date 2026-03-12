import { useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useAppStore } from '../store';
import { getEngine } from './Sketch';
import { getAllDesigns, saveDesign, deleteDesign, type SavedDesign } from '../designsDB';

/** Load saved designs from IndexedDB into the store. */
async function refreshDesigns() {
  const designs = await getAllDesigns();
  useAppStore.getState().setSavedDesigns(designs);
}

export function DesignsPanel() {
  const savedDesigns = useAppStore((s) => s.savedDesigns);

  // Load designs on mount
  useEffect(() => {
    refreshDesigns();
  }, []);

  const handleSaveToLibrary = async () => {
    const engine = getEngine();
    if (!engine) return;

    const name = prompt('Design name:', `Design ${savedDesigns.length + 1}`);
    if (!name) return;

    const json = engine.saveProject();
    const svgPreview = engine.exportDrawingSVG();

    const design: SavedDesign = {
      id: crypto.randomUUID(),
      name,
      json,
      svgPreview,
      createdAt: Date.now(),
    };

    await saveDesign(design);
    await refreshDesigns();
  };

  const handleImport = (design: SavedDesign) => {
    getEngine()?.importDesign(design.json);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDesign(id);
    await refreshDesigns();
  };

  return (
    <div className="absolute left-[72px] bottom-10 z-20 w-52">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-3 flex flex-col gap-2 max-h-80">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Library</h3>
          <button
            onClick={handleSaveToLibrary}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Save current design to library"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto panel-scroll">
          {savedDesigns.length === 0 && (
            <p className="text-[10px] text-gray-400 text-center py-3">
              No saved designs yet.<br />Click + to save current design.
            </p>
          )}
          {savedDesigns.map((design) => (
            <button
              key={design.id}
              onClick={() => handleImport(design)}
              className="group relative flex flex-col gap-1 p-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
              title={`Import "${design.name}" into sketch`}
            >
              {/* SVG Preview */}
              <div
                className="w-full h-20 bg-gray-50 rounded overflow-hidden flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: design.svgPreview }}
              />
              {/* Name & date */}
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] text-gray-600 truncate flex-1">{design.name}</span>
                <button
                  onClick={(e) => handleDelete(e, design.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                  title="Delete design"
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
