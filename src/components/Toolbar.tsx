import {
  MousePointer2,
  Minus,
  Spline,
  Circle,
  Square,
  Type,
  Hand,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Ellipsis,
  Ruler,
  Component,
  Scissors,
} from 'lucide-react';
import { useAppStore, type Tool } from '../store';
import { getEngine } from './Sketch';

interface ToolDef {
  id: Tool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

// Tool rows: each sub-array is a row of 1-2 tools, null = separator
type ToolRow = ToolDef[] | null;

const toolRows: ToolRow[] = [
  // Select & Pan
  [
    { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
    { id: 'pan', icon: <Hand size={18} />, label: 'Pan', shortcut: 'H' },
  ],
  null, // separator
  // Line & Measure
  [
    { id: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
    { id: 'measure', icon: <Ruler size={18} />, label: 'Measure', shortcut: 'M' },
  ],
  // Polyline & Arc
  [
    { id: 'polyline', icon: <Spline size={18} />, label: 'Polyline', shortcut: 'P' },
    { id: 'arc', icon: <Spline size={18} className="rotate-45" />, label: 'Arc (3-pt)', shortcut: 'A' },
  ],
  null, // separator
  // Circle & Rectangle
  [
    { id: 'circle', icon: <Circle size={18} />, label: 'Circle', shortcut: 'C' },
    { id: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
  ],
  null, // separator
  // Dot & Text
  [
    { id: 'dot', icon: <Circle size={8} fill="currentColor" />, label: 'Dot', shortcut: 'D' },
    { id: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  ],
  null, // separator
  // Cut
  [
    { id: 'cut', icon: <Scissors size={18} />, label: 'Cut', shortcut: 'X' },
  ],
];

export function Toolbar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const setActiveTool = useAppStore((s) => s.setActiveTool);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const undoStack = useAppStore((s) => s.undoStack);
  const redoStack = useAppStore((s) => s.redoStack);
  const selectedCount = useAppStore((s) => s.selectedCount);
  const showLibrary = useAppStore((s) => s.showLibrary);
  const setShowLibrary = useAppStore((s) => s.setShowLibrary);

  const handleUndo = () => {
    const entry = undo();
    if (entry) getEngine()?.restoreFromJSON(entry.json);
  };

  const handleRedo = () => {
    const entry = redo();
    if (entry) getEngine()?.restoreFromJSON(entry.json);
  };

  const handleDelete = () => getEngine()?.deleteSelected();
  const handleDuplicate = () => getEngine()?.duplicateSelected();
  const handleFit = () => getEngine()?.fitToView();

  const handleRadialClone = () => {
    const countStr = prompt('Number of copies (total including original):', '12');
    if (!countStr) return;
    const count = parseInt(countStr, 10);
    if (count >= 2 && count <= 360) {
      getEngine()?.radialClone(count);
    }
  };

  const handleMirrorH = () => getEngine()?.mirrorHorizontal();
  const handleMirrorV = () => getEngine()?.mirrorVertical();

  return (
    <div className="absolute left-3 top-11 bottom-3 flex flex-col gap-1 z-20 justify-center">
      {/* Drawing tools */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-1.5 flex flex-col gap-0.5">
        {toolRows.map((row, i) => {
          if (row === null) {
            return <div key={`sep-${i}`} className="h-px bg-gray-200 my-0.5" />;
          }
          return (
            <div key={`row-${i}`} className="flex gap-0.5">
              {row.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-100 group relative ${
                    activeTool === tool.id && !showLibrary
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  {tool.icon}
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {tool.label} <span className="text-gray-400 ml-1">{tool.shortcut}</span>
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-1.5 flex flex-col gap-0.5">
        <div className="flex gap-0.5">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Cmd+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="h-px bg-gray-200 my-0.5" />

        <div className="flex gap-0.5">
          <button
            onClick={handleDuplicate}
            disabled={selectedCount === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Duplicate"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedCount === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="h-px bg-gray-200 my-0.5" />

        <button
          onClick={handleRadialClone}
          disabled={selectedCount === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed group relative"
          title="Radial Clone"
        >
          <RotateCcw size={16} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Radial Clone
          </span>
        </button>
        <div className="flex gap-0.5">
          <button
            onClick={handleMirrorH}
            disabled={selectedCount === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed group relative"
            title="Mirror Horizontal"
          >
            <FlipHorizontal size={16} />
          </button>
          <button
            onClick={handleMirrorV}
            disabled={selectedCount === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed group relative"
            title="Mirror Vertical"
          >
            <FlipVertical size={16} />
          </button>
        </div>
      </div>

      {/* Fit View */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-1.5 flex flex-col gap-0.5">
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-100 group relative ${
            showLibrary
              ? 'bg-purple-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
          title="Component Library"
        >
          <Component size={16} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Components
          </span>
        </button>
      </div>
    </div>
  );
}
