import { describe, it, expect, beforeEach, vi } from 'vitest';
import paper from 'paper';
import { isBooleanEligible, canPerformBoolean } from '../engine/selection/BooleanOps';
import type { PendingActionState } from '../engine/handlers/PendingAction';
import { MM_TO_PX } from '../engine/types';

// ── Paper.js setup ──

let scope: paper.PaperScope;

beforeEach(() => {
  scope = new paper.PaperScope();
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  scope.setup(canvas);
});

// ── BooleanOps ──

describe('isBooleanEligible', () => {
  it('returns true for a plain path', () => {
    scope.activate();
    const path = new scope.Path.Circle(new scope.Point(0, 0), 10);
    expect(isBooleanEligible(path)).toBe(true);
  });

  it('returns false for PointText', () => {
    scope.activate();
    const text = new scope.PointText(new scope.Point(0, 0));
    text.content = 'hello';
    expect(isBooleanEligible(text)).toBe(false);
  });

  it('returns false for component instances', () => {
    scope.activate();
    const path = new scope.Path.Circle(new scope.Point(0, 0), 10);
    path.data = { isComponentInstance: true };
    expect(isBooleanEligible(path)).toBe(false);
  });

  it('returns false for dot items', () => {
    scope.activate();
    const path = new scope.Path.Circle(new scope.Point(0, 0), 2);
    path.data = { isDot: true };
    expect(isBooleanEligible(path)).toBe(false);
  });

  it('returns false for groups containing text', () => {
    scope.activate();
    const text = new scope.PointText(new scope.Point(0, 0));
    text.content = 'label';
    const group = new scope.Group([text]);
    expect(isBooleanEligible(group)).toBe(false);
  });

  it('returns true for groups without text', () => {
    scope.activate();
    const p1 = new scope.Path.Circle(new scope.Point(0, 0), 5);
    const group = new scope.Group([p1]);
    expect(isBooleanEligible(group)).toBe(true);
  });
});

describe('canPerformBoolean', () => {
  it('returns true for exactly 2 eligible items', () => {
    scope.activate();
    const a = new scope.Path.Circle(new scope.Point(0, 0), 10);
    const b = new scope.Path.Rectangle(new scope.Rectangle(0, 0, 20, 20));
    expect(canPerformBoolean([a, b])).toBe(true);
  });

  it('returns false for fewer than 2 items', () => {
    scope.activate();
    const a = new scope.Path.Circle(new scope.Point(0, 0), 10);
    expect(canPerformBoolean([a])).toBe(false);
    expect(canPerformBoolean([])).toBe(false);
  });

  it('returns false for more than 2 items', () => {
    scope.activate();
    const items = [
      new scope.Path.Circle(new scope.Point(0, 0), 10),
      new scope.Path.Circle(new scope.Point(5, 5), 10),
      new scope.Path.Circle(new scope.Point(10, 10), 10),
    ];
    expect(canPerformBoolean(items)).toBe(false);
  });

  it('returns false when one item is ineligible', () => {
    scope.activate();
    const path = new scope.Path.Circle(new scope.Point(0, 0), 10);
    const text = new scope.PointText(new scope.Point(0, 0));
    text.content = 'hi';
    expect(canPerformBoolean([path, text])).toBe(false);
  });
});

// ── PendingAction types ──

describe('PendingActionState', () => {
  it('accepts valid action types', () => {
    scope.activate();
    const item = new scope.Path.Circle(new scope.Point(0, 0), 10);

    const centerH: PendingActionState = {
      type: 'centerH',
      items: [item],
    };
    expect(centerH.type).toBe('centerH');

    const centerV: PendingActionState = {
      type: 'centerV',
      items: [item],
    };
    expect(centerV.type).toBe('centerV');

    const radial: PendingActionState = {
      type: 'radialClone',
      items: [item],
      count: 12,
    };
    expect(radial.type).toBe('radialClone');
    expect(radial.count).toBe(12);
  });
});

// ── MeasureTool (buildMeasureGroup) ──

describe('buildMeasureGroup', () => {
  it('returns null for very short distances', async () => {
    const { buildMeasureGroup } = await import('../engine/tools/MeasureTool');
    scope.activate();

    const ctx = {
      scope,
      canvas: scope.view.element,
      gridLayer: scope.project.activeLayer,
      dialLayer: scope.project.activeLayer,
      drawLayer: scope.project.activeLayer,
      overlayLayer: scope.project.activeLayer,
      callbacks: {},
    };

    const start = new scope.Point(0, 0);
    const end = new scope.Point(0, 0.1);
    const result = buildMeasureGroup(ctx, start, end, '#000000');
    expect(result).toBeNull();
  });

  it('creates a group with line, arrows, and label for valid distance', async () => {
    const { buildMeasureGroup } = await import('../engine/tools/MeasureTool');
    scope.activate();

    const ctx = {
      scope,
      canvas: scope.view.element,
      gridLayer: scope.project.activeLayer,
      dialLayer: scope.project.activeLayer,
      drawLayer: scope.project.activeLayer,
      overlayLayer: scope.project.activeLayer,
      callbacks: {},
    };

    const start = new scope.Point(0, 0);
    const end = new scope.Point(100, 0); // 100 px = 10 mm
    const result = buildMeasureGroup(ctx, start, end, '#FF0000');

    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(scope.Group);
    // Should contain: line + 2 arrows + label text = 4 children
    expect(result!.children.length).toBe(4);

    // The label should show the distance in mm
    const textItem = result!.children[3] as paper.PointText;
    expect(textItem.content).toBe('10.00 mm');
  });
});

// ── MM_TO_PX conversions (extended) ──

describe('MM_TO_PX conversions', () => {
  it('converts standard dial sizes correctly', () => {
    expect(28.5 * MM_TO_PX).toBe(285);
    expect(40 * MM_TO_PX).toBe(400);
    expect(0.5 * MM_TO_PX).toBe(5);
  });
});
