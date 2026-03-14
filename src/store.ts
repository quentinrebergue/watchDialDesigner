import { create } from 'zustand';
import type { SelectionPropsPayload } from './engine/types';
import type { SavedDesign } from './designsDB';
import type { SavedComponent } from './componentsDB';

// ── Types ──────────────────────────────────────────────────────

export type DocumentType = 'project' | 'component';

export type Tool =
  | 'select'
  | 'line'
  | 'polyline'
  | 'arc'
  | 'circle'
  | 'ellipse'
  | 'rectangle'
  | 'polygon'
  | 'dot'
  | 'text'
  | 'textArc'
  | 'measure'
  | 'cut'
  | 'pan';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export type GridMode = 'polar' | 'cartesian' | 'none';

export type DialShape = 'circle' | 'square' | 'cushion';

export type MeasureSnapMode = 'free' | 'radial' | 'cartesian';

export interface GridSettings {
  showPolar: boolean;
  showCartesian: boolean;
  polarCircleSpacing: number;  // mm between concentric circles
  polarAngleSpacing: number;   // degrees between radial lines
  cartesianSpacing: number;    // mm between cartesian grid lines
  snapSpacing: number;         // mm – independent snap grid resolution
}

export type SnapMode = 'grid' | 'angular' | 'free';

export interface SnapSettings {
  mode: SnapMode;
  angularStep: number; // degrees
}

/** Re-export the engine type as the store-facing alias. */
export type SelectionProps = SelectionPropsPayload;

// ── Undo / Redo (JSON snapshot) ────────────────────────────────

// We store Paper.js JSON snapshots for undo/redo
interface HistoryEntry {
  json: string; // paper.project.exportJSON()
}

// ── State interface ────────────────────────────────────────────

interface AppState {
  // Tool
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;

  // Style defaults
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;

  // Dial
  diameter: number; // mm
  setDiameter: (d: number) => void;
  dialColor: string;
  setDialColor: (c: string) => void;
  dialShape: DialShape;
  setDialShape: (s: DialShape) => void;

  // Grid
  gridMode: GridMode;
  setGridMode: (m: GridMode) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  gridSettings: GridSettings;
  setGridSettings: (s: Partial<GridSettings>) => void;

  // Snap
  snap: SnapSettings;
  setSnap: (s: Partial<SnapSettings>) => void;

  // Layers
  layers: Layer[];
  activeLayerId: string;
  addLayer: (name: string) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  setActiveLayer: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;

  // Undo / Redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  pushUndo: (json: string) => void;
  undo: () => HistoryEntry | undefined;
  redo: () => HistoryEntry | undefined;

  // Selection info (readable by properties panel)
  selectedCount: number;
  setSelectedCount: (n: number) => void;

  // Detailed selection properties
  selectionProps: SelectionProps | null;
  setSelectionProps: (p: SelectionProps | null) => void;

  // Show center point overlay
  showCenterPoint: boolean;
  setShowCenterPoint: (v: boolean) => void;

  // Polygon sides (for polygon tool)
  polygonSides: number;
  setPolygonSides: (n: number) => void;

  // Measure snap mode
  measureSnapMode: MeasureSnapMode;
  setMeasureSnapMode: (m: MeasureSnapMode) => void;

  // Zoom
  zoom: number;
  setZoom: (z: number) => void;

  // Saved designs library
  savedDesigns: SavedDesign[];
  setSavedDesigns: (designs: SavedDesign[]) => void;

  // Document type
  documentType: DocumentType;
  setDocumentType: (t: DocumentType) => void;

  // Component library
  savedComponents: SavedComponent[];
  setSavedComponents: (components: SavedComponent[]) => void;
  showLibrary: boolean;
  setShowLibrary: (v: boolean) => void;

  // Status message (shown in status bar)
  statusMessage: string | null;
  setStatusMessage: (m: string | null) => void;
}

// ── Helpers ────────────────────────────────────────────────────

let layerIdCounter = 1;
const makeLayerId = () => `layer_${layerIdCounter++}`;

const defaultLayerId = makeLayerId();

// ── Store ──────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // Tool
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool, showLibrary: false }),

  // Measure snap
  measureSnapMode: 'free' as MeasureSnapMode,
  setMeasureSnapMode: (m) => set({ measureSnapMode: m }),

  // Style
  strokeColor: '#000000',
  setStrokeColor: (color) => set({ strokeColor: color }),
  fillColor: 'transparent',
  setFillColor: (color) => set({ fillColor: color }),
  strokeWidth: 0.5,
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  // Dial
  diameter: 28.5,
  setDiameter: (diameter) => set({ diameter }),
  dialColor: '#ffffff',
  setDialColor: (dialColor) => set({ dialColor }),
  dialShape: 'circle' as DialShape,
  setDialShape: (dialShape) => set({ dialShape }),

  // Grid
  gridMode: 'polar',
  setGridMode: (gridMode) => set({ gridMode }),
  showGrid: true,
  setShowGrid: (showGrid) => set({ showGrid }),
  gridSettings: {
    showPolar: true,
    showCartesian: false,
    polarCircleSpacing: 1,
    polarAngleSpacing: 6,
    cartesianSpacing: 1,
    snapSpacing: 1,
  },
  setGridSettings: (partial) =>
    set((s) => ({ gridSettings: { ...s.gridSettings, ...partial } })),

  // Snap
  snap: {
    mode: 'grid' as SnapMode,
    angularStep: 6,
  },
  setSnap: (partial) =>
    set((s) => ({ snap: { ...s.snap, ...partial } })),

  // Layers
  layers: [
    { id: defaultLayerId, name: 'Layer 1', visible: true, locked: false, order: 0 },
  ],
  activeLayerId: defaultLayerId,

  addLayer: (name) => {
    const id = makeLayerId();
    set((s) => ({
      layers: [...s.layers, { id, name, visible: true, locked: false, order: s.layers.length }],
      activeLayerId: id,
    }));
  },
  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return s; // keep at least one
      const layers = s.layers.filter((l) => l.id !== id);
      return {
        layers,
        activeLayerId: s.activeLayerId === id ? layers[0].id : s.activeLayerId,
      };
    }),
  toggleLayerVisibility: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),
  toggleLayerLock: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    })),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  renameLayer: (id, name) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)),
    })),
  moveLayerUp: (id) =>
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === id);
      if (idx <= 0) return s;
      const layers = [...s.layers];
      [layers[idx - 1], layers[idx]] = [layers[idx], layers[idx - 1]];
      return { layers };
    }),
  moveLayerDown: (id) =>
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === id);
      if (idx < 0 || idx >= s.layers.length - 1) return s;
      const layers = [...s.layers];
      [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
      return { layers };
    }),

  // Undo / Redo
  undoStack: [],
  redoStack: [],
  pushUndo: (json) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), { json }],
      redoStack: [],
    })),
  undo: () => {
    const s = get();
    if (s.undoStack.length === 0) return undefined;
    const entry = s.undoStack[s.undoStack.length - 1];
    set({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, entry],
    });
    return entry;
  },
  redo: () => {
    const s = get();
    if (s.redoStack.length === 0) return undefined;
    const entry = s.redoStack[s.redoStack.length - 1];
    set({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, entry],
    });
    return entry;
  },

  // Selection
  selectedCount: 0,
  setSelectedCount: (n) => set({ selectedCount: n }),

  selectionProps: null,
  setSelectionProps: (p) => set({ selectionProps: p }),

  showCenterPoint: false,
  setShowCenterPoint: (v) => set({ showCenterPoint: v }),

  // Polygon
  polygonSides: 6,
  setPolygonSides: (n) => set({ polygonSides: n }),

  // Zoom
  zoom: 1,
  setZoom: (zoom) => set({ zoom }),

  // Saved designs library
  savedDesigns: [],
  setSavedDesigns: (designs) => set({ savedDesigns: designs }),

  // Document type
  documentType: 'project' as DocumentType,
  setDocumentType: (documentType) => set({ documentType }),

  // Component library
  savedComponents: [],
  setSavedComponents: (components) => set({ savedComponents: components }),
  showLibrary: false,
  setShowLibrary: (showLibrary) => set({ showLibrary }),

  // Status message
  statusMessage: null,
  setStatusMessage: (statusMessage) => set({ statusMessage }),
}));
