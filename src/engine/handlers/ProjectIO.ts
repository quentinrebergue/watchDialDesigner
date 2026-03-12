import type { CanvasEngine } from '../CanvasEngine';

// ── Save / Load project ──────────────────────────────────

export function saveProject(engine: CanvasEngine): string {
  engine.drawLayer.activate();
  const data = {
    version: 1,
    diameter: engine.diameter,
    drawing: engine.drawLayer.exportJSON(),
  };
  return JSON.stringify(data);
}

export function loadProject(engine: CanvasEngine, json: string): number | undefined {
  const data = JSON.parse(json) as { version?: number; diameter?: number; drawing?: string };
  if (data.drawing) {
    engine.drawLayer.activate();
    engine.drawLayer.removeChildren();
    engine.drawLayer.importJSON(data.drawing);
    engine.selection.deselectAll();
  }
  if (data.diameter && data.diameter > 0) {
    engine.setDiameter(data.diameter);
  }
  return data.diameter;
}

// ── SVG Export ───────────────────────────────────────────

/** Hide construction dots (isDot) before export, restore after. */
function withDotsHidden<T>(engine: CanvasEngine, fn: () => T): T {
  const dots: paper.Item[] = [];
  engine.drawLayer.children.forEach((item) => {
    if (item.data?.isDot) { dots.push(item); item.visible = false; }
  });
  const result = fn();
  dots.forEach((d) => { d.visible = true; });
  return result;
}

export function exportSVG(engine: CanvasEngine): string {
  const gridVis = engine.gridLayer.visible;
  const dialVis = engine.dialLayer.visible;
  const overlayVis = engine.overlayLayer.visible;
  engine.gridLayer.visible = false;
  engine.overlayLayer.visible = false;
  const svg = withDotsHidden(engine, () =>
    engine.scope.project.exportSVG({ asString: true }) as string
  );
  engine.gridLayer.visible = gridVis;
  engine.dialLayer.visible = dialVis;
  engine.overlayLayer.visible = overlayVis;
  return svg;
}

export function exportDrawingSVG(engine: CanvasEngine): string {
  const gridVis = engine.gridLayer.visible;
  const dialVis = engine.dialLayer.visible;
  const overlayVis = engine.overlayLayer.visible;
  engine.gridLayer.visible = false;
  engine.dialLayer.visible = false;
  engine.overlayLayer.visible = false;
  engine.selection.deselectAll();
  const svg = withDotsHidden(engine, () =>
    engine.scope.project.exportSVG({ asString: true }) as string
  );
  engine.gridLayer.visible = gridVis;
  engine.dialLayer.visible = dialVis;
  engine.overlayLayer.visible = overlayVis;
  return svg;
}

// ── Import design as grouped object ──────────────────────

export function importDesign(engine: CanvasEngine, projectJson: string): paper.Item | null {
  const data = JSON.parse(projectJson) as { drawing?: string };
  if (!data.drawing) return null;

  engine.drawLayer.activate();
  const tempLayer = new engine.scope.Layer();
  tempLayer.importJSON(data.drawing);
  const children = tempLayer.removeChildren();
  tempLayer.remove();

  if (children.length === 0) return null;

  engine.drawLayer.activate();
  const group = new engine.scope.Group(children);
  engine.drawLayer.addChild(group);
  group.position = engine.scope.view.center;

  engine.pushUndoState();
  engine.autoSelect(group);
  return group;
}

// ── Component support ────────────────────────────────────

export function createComponentFromSelection(engine: CanvasEngine): { json: string; svgPreview: string } | null {
  if (engine.selection.selectedItems.length === 0) return null;

  engine.drawLayer.activate();
  const tempLayer = new engine.scope.Layer();
  const items = engine.selection.selectedItems;
  const clones: paper.Item[] = [];
  for (const item of items) {
    clones.push(item.clone());
  }
  for (const c of clones) {
    tempLayer.addChild(c);
  }

  const json = tempLayer.exportJSON();

  engine.gridLayer.visible = false;
  engine.dialLayer.visible = false;
  engine.overlayLayer.visible = false;
  engine.drawLayer.visible = false;
  tempLayer.visible = true;
  const svgPreview = engine.scope.project.exportSVG({ asString: true }) as string;
  engine.gridLayer.visible = true;
  engine.dialLayer.visible = true;
  engine.overlayLayer.visible = true;
  engine.drawLayer.visible = true;

  tempLayer.remove();

  const data = JSON.stringify({ version: 1, drawing: json });
  return { json: data, svgPreview };
}

export function placeComponentInstance(
  engine: CanvasEngine,
  componentId: string,
  projectJson: string,
): paper.Item | null {
  const data = JSON.parse(projectJson) as { drawing?: string };
  if (!data.drawing) return null;

  engine.drawLayer.activate();
  const tempLayer = new engine.scope.Layer();
  tempLayer.importJSON(data.drawing);
  for (const item of [...tempLayer.children]) {
    if (item.data?.isDot) item.remove();
  }
  const children = tempLayer.removeChildren();
  tempLayer.remove();

  if (children.length === 0) return null;

  engine.drawLayer.activate();
  const group = new engine.scope.Group(children);
  group.data = { componentId, isComponentInstance: true };
  engine.drawLayer.addChild(group);
  group.position = engine.scope.view.center;

  engine.pushUndoState();
  engine.autoSelect(group);
  return group;
}
