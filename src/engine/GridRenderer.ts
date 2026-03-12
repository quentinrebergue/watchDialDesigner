import type { GridSettings, DialShape } from '../store';
import { MM_TO_PX, type EngineContext } from './types';

/**
 * Handles rendering the polar/cartesian grid and the dial boundary circle.
 */
export class GridRenderer {
  private ctx: EngineContext;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
  }

  drawGrid(showGrid: boolean, diameter: number, gs: GridSettings, zoom: number = 1) {
    const { scope } = this.ctx;
    this.ctx.gridLayer.activate();
    this.ctx.gridLayer.removeChildren();

    if (!showGrid) {
      this.ctx.drawLayer.activate();
      return;
    }

    const center = new scope.Point(0, 0);
    const radiusMm = diameter / 2;

    const gridColor = new scope.Color('#d0d0d0');
    const gridColorLight = new scope.Color('#e8e8e8');

    // Smart stroke widths: thinner at high zoom so grid doesn't overwhelm
    const baseMinor = 0.4 / zoom;
    const baseMajor = 0.8 / zoom;

    // Smart spacing: subdivide when zoomed in, merge when zoomed out
    function smartSpacing(baseSpacing: number): number {
      const pixelSpacing = baseSpacing * 10 * zoom; // MM_TO_PX = 10
      if (pixelSpacing > 80) return baseSpacing / 2;
      if (pixelSpacing > 40) return baseSpacing;
      if (pixelSpacing > 15) return baseSpacing * 2;
      return baseSpacing * 5;
    }

    function smartAngleSpacing(baseAngle: number): number {
      const pxPerDeg = (radiusMm * 10 * zoom * Math.PI) / 180;
      const pixelSpacing = baseAngle * pxPerDeg;
      if (pixelSpacing > 80) return baseAngle / 2;
      if (pixelSpacing > 30) return baseAngle;
      if (pixelSpacing > 10) return baseAngle * 2;
      return baseAngle * 5;
    }

    // ── Polar grid ──
    if (gs.showPolar) {
      const circleStep = Math.max(0.1, smartSpacing(gs.polarCircleSpacing));
      const majorCircle = Math.round(5 / circleStep) * circleStep || circleStep * 5;
      for (let r = circleStep; r <= radiusMm; r += circleStep) {
        const c = new scope.Path.Circle(center, r * MM_TO_PX);
        const isMajor =
          Math.abs(r % majorCircle) < 0.001 ||
          Math.abs((r % majorCircle) - majorCircle) < 0.001;
        c.strokeColor = isMajor ? gridColor : gridColorLight;
        c.strokeWidth = isMajor ? baseMajor : baseMinor;
        c.fillColor = null;
      }
      const angleStep = Math.max(1, smartAngleSpacing(gs.polarAngleSpacing));
      const majorAngle = Math.round(30 / angleStep) * angleStep || angleStep * 6;
      for (let deg = 0; deg < 360; deg += angleStep) {
        const rad = (deg * Math.PI) / 180;
        const end = new scope.Point(
          Math.cos(rad) * radiusMm * MM_TO_PX,
          Math.sin(rad) * radiusMm * MM_TO_PX,
        );
        const line = new scope.Path.Line(center, end);
        const isMajor = Math.abs(deg % majorAngle) < 0.001;
        line.strokeColor = isMajor ? gridColor : gridColorLight;
        line.strokeWidth = isMajor ? baseMajor : baseMinor;
      }
    }

    // ── Cartesian grid ──
    if (gs.showCartesian) {
      const step = Math.max(0.1, smartSpacing(gs.cartesianSpacing));
      const majorStep = Math.round(5 / step) * step || step * 5;
      const extent = radiusMm * MM_TO_PX;
      const maxI = Math.ceil(radiusMm / step);
      for (let i = -maxI; i <= maxI; i++) {
        const p = i * step * MM_TO_PX;
        const h = new scope.Path.Line(new scope.Point(-extent, p), new scope.Point(extent, p));
        const isMajor =
          Math.abs((i * step) % majorStep) < 0.001 ||
          Math.abs(((i * step) % majorStep) - majorStep) < 0.001;
        h.strokeColor = isMajor ? gridColor : gridColorLight;
        h.strokeWidth = isMajor ? baseMajor : baseMinor;

        const v = new scope.Path.Line(new scope.Point(p, -extent), new scope.Point(p, extent));
        v.strokeColor = isMajor ? gridColor : gridColorLight;
        v.strokeWidth = isMajor ? baseMajor : baseMinor;
      }
    }

    this.ctx.drawLayer.activate();
  }

  drawDial(diameter: number, color: string = '#ffffff', shape: DialShape = 'circle') {
    const { scope } = this.ctx;
    this.ctx.dialLayer.activate();
    this.ctx.dialLayer.removeChildren();

    const radius = (diameter / 2) * MM_TO_PX;
    const center = new scope.Point(0, 0);

    // Dial shape
    let dial: InstanceType<typeof scope.Path>;
    switch (shape) {
      case 'square':
        dial = new scope.Path.Rectangle(
          new scope.Rectangle(center.subtract(new scope.Point(radius, radius)), new scope.Size(radius * 2, radius * 2))
        );
        break;
      case 'cushion': {
        const r = radius * 0.25;
        dial = new scope.Path.Rectangle(
          new scope.Rectangle(center.subtract(new scope.Point(radius, radius)), new scope.Size(radius * 2, radius * 2)),
          new scope.Size(r, r)
        );
        break;
      }
      default: // 'circle'
        dial = new scope.Path.Circle(center, radius);
    }
    dial.strokeColor = new scope.Color('#999999');
    dial.strokeWidth = 1;
    dial.fillColor = new scope.Color(color);

    // Center cross
    const crossSize = 3;
    const h = new scope.Path.Line(
      new scope.Point(-crossSize, 0),
      new scope.Point(crossSize, 0),
    );
    h.strokeColor = new scope.Color('#999999');
    h.strokeWidth = 0.5;
    const v = new scope.Path.Line(
      new scope.Point(0, -crossSize),
      new scope.Point(0, crossSize),
    );
    v.strokeColor = new scope.Color('#999999');
    v.strokeWidth = 0.5;

    this.ctx.drawLayer.activate();
  }
}
