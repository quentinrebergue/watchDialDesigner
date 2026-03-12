import { useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  Crosshair,
  Replace,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  Grid3X3,
  Component,
  Scissors,
  Plus,
  Diameter,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { getEngine } from '../Sketch';
import { saveComponent, getAllComponents, type SavedComponent } from '../../componentsDB';
import { Panel, Field } from './Panel';

export function SelectionPanel() {
  const {
    selectedCount,
    selectionProps,
    showCenterPoint, setShowCenterPoint,
  } = useAppStore();

  if (selectedCount <= 0 || !selectionProps) return null;

  return (
    <Panel title={`Selection (${selectedCount})`}>
      {/* Center buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => getEngine()?.centerSelectionHorizontally()}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 flex-1 justify-center"
          title="Center horizontally (align on X axis)"
        >
          <AlignCenterHorizontal size={12} />
          Center H
        </button>
        <button
          onClick={() => getEngine()?.centerSelectionVertically()}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 flex-1 justify-center"
          title="Center vertically (align on Y axis)"
        >
          <AlignCenterVertical size={12} />
          Center V
        </button>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="X (mm)">
          <input
            type="number"
            value={parseFloat(selectionProps.x.toFixed(2))}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) getEngine()?.setSelectionPosition(v, selectionProps.y);
            }}
            step={0.1}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </Field>
        <Field label="Y (mm)">
          <input
            type="number"
            value={parseFloat(selectionProps.y.toFixed(2))}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) getEngine()?.setSelectionPosition(selectionProps.x, v);
            }}
            step={0.1}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </Field>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="W (mm)">
          <input
            type="number"
            value={parseFloat(selectionProps.width.toFixed(2))}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v > 0) getEngine()?.setSelectionSize(v, selectionProps.height);
            }}
            step={0.1}
            min={0.1}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </Field>
        <Field label="H (mm)">
          <input
            type="number"
            value={parseFloat(selectionProps.height.toFixed(2))}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v > 0) getEngine()?.setSelectionSize(selectionProps.width, v);
            }}
            step={0.1}
            min={0.1}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </Field>
      </div>

      {/* Rotation */}
      <Field label="Rotation (°)">
        <RotationInput
          rotation={selectionProps.rotation}
          onCommit={(v) => getEngine()?.setSelectionRotation(v)}
        />
      </Field>

      {/* Stroke & Fill */}
      <div className="pt-1 border-t border-gray-100 flex flex-col gap-1.5">
        <Field label="Stroke">
          <div className="flex items-center gap-1 min-w-0">
            <input
              type="color"
              value={selectionProps.strokeColor}
              onChange={(e) => getEngine()?.setSelectionStrokeColor(e.target.value)}
              className="w-5 h-5 shrink-0 rounded border border-gray-300 cursor-pointer p-0"
            />
            <input
              type="number"
              value={parseFloat(selectionProps.strokeWidth.toFixed(2))}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0) getEngine()?.setSelectionStrokeWidth(v);
              }}
              step={0.1}
              min={0}
              className="w-12 shrink-0 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[9px] text-gray-400">mm</span>
          </div>
        </Field>
        <Field label="Fill">
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={selectionProps.fillColor === 'transparent' ? '#ffffff' : selectionProps.fillColor}
              onChange={(e) => getEngine()?.setSelectionFillColor(e.target.value)}
              className="w-5 h-5 rounded border border-gray-300 cursor-pointer p-0"
            />
            <button
              onClick={() => getEngine()?.setSelectionFillColor('transparent')}
              className={`text-[10px] px-1 py-0.5 rounded ${
                selectionProps.fillColor === 'transparent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              None
            </button>
          </div>
        </Field>
      </div>

      {/* Text properties */}
      {selectionProps.isText && (
        <div className="pt-1 border-t border-gray-100 flex flex-col gap-1.5">
          <Field label="Text">
            <input
              type="text"
              value={selectionProps.textContent}
              onChange={(e) => getEngine()?.setSelectionTextContent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </Field>
          <Field label="Align H">
            <div className="flex gap-0.5">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => getEngine()?.setSelectionTextAlignH(a)}
                  className={`p-1 rounded ${selectionProps.textAlignH === a ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  title={`Align ${a}`}
                >
                  {a === 'left' ? <AlignLeft size={12} /> : a === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Align V">
            <div className="flex gap-0.5">
              {(['top', 'center', 'bottom'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => getEngine()?.setSelectionTextAlignV(a)}
                  className={`p-1 rounded ${selectionProps.textAlignV === a ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  title={`Align ${a}`}
                >
                  {a === 'top' ? <AlignStartVertical size={12} /> : a === 'center' ? <Grid3X3 size={12} /> : <AlignEndVertical size={12} />}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Show center point */}
      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pt-1 border-t border-gray-100">
        <input
          type="checkbox"
          checked={showCenterPoint}
          onChange={(e) => setShowCenterPoint(e.target.checked)}
          className="rounded"
        />
        <Crosshair size={12} />
        Show center point
      </label>

      {/* Boolean operations */}
      {selectionProps.canBoolean && (
        <div className="pt-1 border-t border-gray-100 flex flex-col gap-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Boolean</span>
          <div className="flex gap-1">
            <button
              onClick={() => getEngine()?.booleanSubtract()}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 flex-1 justify-center"
              title="Subtract: cut the second shape from the first"
            >
              <Scissors size={12} />
              Subtract
            </button>
            <button
              onClick={() => getEngine()?.booleanUnite()}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 flex-1 justify-center"
              title="Unite: merge both shapes into one"
            >
              <Plus size={12} />
              Unite
            </button>
            <button
              onClick={() => getEngine()?.booleanIntersect()}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 flex-1 justify-center"
              title="Intersect: keep only the overlapping area"
            >
              <Diameter size={12} />
              Intersect
            </button>
          </div>
        </div>
      )}

      {/* Replace */}
      {selectedCount === 1 && (
        <button
          onClick={() => getEngine()?.startReplaceMode()}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700 w-full justify-center mt-1 border-t border-gray-100 pt-2"
          title="Click then click another object on canvas to replace it with this one"
        >
          <Replace size={12} />
          Replace another object with this
        </button>
      )}

      {/* Create Component from Selection */}
      <button
        onClick={async () => {
          const engine = getEngine();
          if (!engine) return;
          const result = engine.createComponentFromSelection();
          if (!result) return;
          const name = prompt('Component name:');
          if (!name) return;
          const comp: SavedComponent = {
            id: crypto.randomUUID(),
            name,
            json: result.json,
            svgPreview: result.svgPreview,
            createdAt: Date.now(),
          };
          await saveComponent(comp);
          const components = await getAllComponents();
          useAppStore.getState().setSavedComponents(components);
          useAppStore.getState().setShowLibrary(true);
        }}
        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 w-full justify-center border border-purple-200"
        title="Save selected objects as a reusable component"
      >
        <Component size={12} />
        Create Component
      </button>
    </Panel>
  );
}

function RotationInput({ rotation, onCommit }: { rotation: number; onCommit: (v: number) => void }) {
  const [local, setLocal] = useState(String(parseFloat(rotation.toFixed(1))));
  const [focused, setFocused] = useState(false);

  const displayRotation = String(parseFloat(rotation.toFixed(1)));
  // Sync the display value when the prop changes and the input isn't focused
  if (!focused && local !== displayRotation) {
    setLocal(displayRotation);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocal(raw);
    const v = parseFloat(raw);
    if (!isNaN(v)) {
      onCommit(Math.max(-360, Math.min(360, v)));
    }
  };

  return (
    <input
      type="number"
      value={local}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      step={1}
      min={-360}
      max={360}
      className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
}
