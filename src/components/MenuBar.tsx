import { useState, useRef, useEffect } from 'react';
import { useAppStore, type DocumentType } from '../store';
import { getEngine } from './Sketch';
import { saveDesign, getAllDesigns, type SavedDesign } from '../designsDB';
import { saveComponent, getAllComponents, type SavedComponent } from '../componentsDB';
import { DialSection } from './menubar/DialSection';
import { GridSection } from './menubar/GridSection';
import { SnapSection } from './menubar/SnapSection';

// ── Menu definitions ──

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  separator?: false;
}
interface MenuSeparator {
  separator: true;
}
type MenuEntry = MenuItem | MenuSeparator;

function isSeparator(e: MenuEntry): e is MenuSeparator {
  return 'separator' in e && e.separator === true;
}

// ── Helpers ──

async function refreshComponents() {
  const components = await getAllComponents();
  useAppStore.getState().setSavedComponents(components);
}

// ── Component ──

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const documentType = useAppStore((s) => s.documentType);
  const selectedCount = useAppStore((s) => s.selectedCount);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ──

  const handleNewProject = () => {
    const engine = getEngine();
    if (!engine) return;
    if (!confirm('Create a new project? Unsaved changes will be lost.')) return;
    engine.clearAll();
    useAppStore.getState().setDocumentType('project');
    useAppStore.getState().setDiameter(28.5);
    setOpenMenu(null);
  };

  const handleNewComponent = () => {
    const engine = getEngine();
    if (!engine) return;
    if (!confirm('Create a new component? Unsaved changes will be lost.')) return;
    engine.clearAll();
    useAppStore.getState().setDocumentType('component');
    setOpenMenu(null);
  };

  const handleSave = async () => {
    const engine = getEngine();
    const json = engine?.saveProject();
    if (!json || !engine) return;

    const ext = documentType === 'component' ? '.wdc.json' : '.wdd.json';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watch-dial${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    if (documentType === 'component') {
      // Save to component library
      const name = prompt('Component name:', `Component ${Date.now()}`);
      if (name) {
        const svgPreview = engine.exportDrawingSVG();
        const comp: SavedComponent = {
          id: crypto.randomUUID(),
          name,
          json,
          svgPreview,
          createdAt: Date.now(),
        };
        await saveComponent(comp);
        await refreshComponents();
      }
    } else {
      // Save to design library
      const svgPreview = engine.exportDrawingSVG();
      const design: SavedDesign = {
        id: crypto.randomUUID(),
        name: `Design ${new Date().toLocaleString()}`,
        json,
        svgPreview,
        createdAt: Date.now(),
      };
      await saveDesign(design);
      useAppStore.getState().setSavedDesigns(await getAllDesigns());
    }
    setOpenMenu(null);
  };

  const handleOpen = (type: DocumentType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'component' ? '.json,.wdc.json' : '.json,.wdd.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const json = reader.result as string;
        const diameter = getEngine()?.loadProject(json);
        if (diameter) useAppStore.getState().setDiameter(diameter);
        useAppStore.getState().setDocumentType(type);
      };
      reader.readAsText(file);
    };
    input.click();
    setOpenMenu(null);
  };

  const handleExportSVG = () => {
    const svg = getEngine()?.exportSVG();
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watch-dial.svg';
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const handleUndo = () => {
    const entry = useAppStore.getState().undo();
    if (entry) getEngine()?.restoreFromJSON(entry.json);
    setOpenMenu(null);
  };

  const handleRedo = () => {
    const entry = useAppStore.getState().redo();
    if (entry) getEngine()?.restoreFromJSON(entry.json);
    setOpenMenu(null);
  };

  const handleDuplicate = () => {
    getEngine()?.duplicateSelected();
    setOpenMenu(null);
  };

  const handleDelete = () => {
    getEngine()?.deleteSelected();
    setOpenMenu(null);
  };

  // ── Menu structures ──

  const fileMenu: MenuEntry[] = [
    { label: 'New Project', action: handleNewProject },
    { label: 'New Component', action: handleNewComponent },
    { separator: true },
    { label: 'Open Project…', shortcut: '⌘O', action: () => handleOpen('project') },
    { label: 'Open Component…', action: () => handleOpen('component') },
    { separator: true },
    { label: 'Save', shortcut: '⌘S', action: handleSave },
    { label: 'Export SVG', action: handleExportSVG },
  ];

  const editMenu: MenuEntry[] = [
    { label: 'Undo', shortcut: '⌘Z', action: handleUndo },
    { label: 'Redo', shortcut: '⇧⌘Z', action: handleRedo },
    { separator: true },
    { label: 'Duplicate', action: handleDuplicate, disabled: selectedCount === 0 },
    { label: 'Delete', action: handleDelete, disabled: selectedCount === 0 },
  ];

  const menus: { label: string; entries: MenuEntry[] }[] = [
    { label: 'File', entries: fileMenu },
    { label: 'Edit', entries: editMenu },
  ];

  // ── Panel sections (Dial, Grid, Snap) ──

  const panelSections = ['Dial', 'Grid', 'Snap'] as const;

  return (
    <div
      ref={barRef}
      className="absolute top-0 left-0 right-0 h-8 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/70 flex items-center px-2 gap-0"
    >
      {/* App name */}
      <span className="text-[11px] font-bold text-gray-500 tracking-wide mr-3 select-none">
        WatchDial
      </span>

      {/* Document type badge */}
      <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mr-3 select-none ${
        documentType === 'component'
          ? 'bg-purple-100 text-purple-600'
          : 'bg-blue-100 text-blue-600'
      }`}>
        {documentType}
      </span>

      {/* Menus */}
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
            className={`text-[11px] px-2 py-1 rounded transition-colors ${
              openMenu === menu.label
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div className="absolute top-full left-0 mt-0.5 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
              {menu.entries.map((entry, i) => {
                if (isSeparator(entry)) {
                  return <div key={`sep-${i}`} className="h-px bg-gray-100 my-1" />;
                }
                return (
                  <button
                    key={entry.label}
                    onClick={entry.action}
                    disabled={entry.disabled}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>{entry.label}</span>
                    {entry.shortcut && (
                      <span className="text-[10px] text-gray-400 ml-4">{entry.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Divider */}
      <div className="w-px h-4 bg-gray-200 mx-2" />

      {/* Panel section buttons (Dial, Grid, Snap) */}
      {panelSections.map((section) => (
        <div key={section} className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === section ? null : section)}
            onMouseEnter={() => openMenu && (panelSections as readonly string[]).includes(openMenu) && setOpenMenu(section)}
            className={`text-[11px] px-2 py-1 rounded transition-colors ${
              openMenu === section
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {section}
          </button>

          {openMenu === section && (
            <div className="absolute top-full left-0 mt-0.5 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[220px] z-50">
              {section === 'Dial' && <DialSection />}
              {section === 'Grid' && <GridSection />}
              {section === 'Snap' && <SnapSection />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


