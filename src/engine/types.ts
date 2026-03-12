import type { Tool } from '../store';

/** Conversion factor: 1 mm = this many Paper.js points on screen at zoom = 1. */
export const MM_TO_PX = 10;

/** Callback payload describing the properties of the current selection. */
export interface SelectionPropsPayload {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isText: boolean;
  textContent: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  textAlignH: 'left' | 'center' | 'right';
  textAlignV: 'top' | 'center' | 'bottom';
  canBoolean: boolean;
}

/** Callbacks emitted by the engine to notify the UI. */
export interface EngineCallbacks {
  onSelectionChange?: (count: number, props: SelectionPropsPayload | null) => void;
  onPushUndo?: (json: string) => void;
  onZoomChange?: (zoom: number) => void;
  onToolChange?: (tool: Tool) => void;
  onStatusMessage?: (message: string | null) => void;
}

/** Shared context passed from the engine to sub-modules. */
export interface EngineContext {
  scope: paper.PaperScope;
  canvas: HTMLCanvasElement;
  gridLayer: paper.Layer;
  dialLayer: paper.Layer;
  drawLayer: paper.Layer;
  overlayLayer: paper.Layer;
  callbacks: EngineCallbacks;
}
