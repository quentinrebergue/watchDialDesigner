import type { EngineContext } from './types';
import { buildMeasureGroup, showMeasurePreview } from './tools/MeasureTool';

interface DrawStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  polygonSides: number;
}

/**
 * Implements all shape‑drawing tools (line, polyline, arc, circle, ellipse,
 * rectangle, polygon, dot, text).  Each tool has a preview method (overlay)
 * and a commit method (draw layer).
 */
export class DrawingTools {
  private ctx: EngineContext;
  private drawPreview: paper.Item | null = null;
  drawStartPoint: paper.Point | null = null;

  // Polyline state
  polylinePoints: paper.Point[] = [];
  private polylinePath: paper.Path | null = null;

  // Arc state
  arcThrough: paper.Point | null = null;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
  }

  // ── Shared style helpers ─────────────────────────────────

  /** Apply stroke style (no fill) to a path. */
  private applyStroke(path: paper.Path, style: DrawStyle) {
    const { scope } = this.ctx;
    path.strokeColor = new scope.Color(style.strokeColor);
    path.strokeWidth = style.strokeWidth;
  }

  /** Apply stroke + optional fill to a path. */
  private applyStyle(path: paper.Path, style: DrawStyle) {
    this.applyStroke(path, style);
    if (style.fillColor !== 'transparent') {
      path.fillColor = new this.ctx.scope.Color(style.fillColor);
    }
  }

  /** Show an item as a translucent preview on the overlay layer. */
  private showPreview(item: paper.Item, opacity = 0.5) {
    this.ctx.overlayLayer.activate();
    this.drawPreview = item;
    this.drawPreview.opacity = opacity;
    this.ctx.drawLayer.activate();
  }

  // ── Preview helpers ──────────────────────────────────────

  clearPreview() {
    this.ctx.overlayLayer.activate();
    this.drawPreview?.remove();
    this.drawPreview = null;
    this.ctx.drawLayer.activate();
  }

  // ── Line ─────────────────────────────────────────────────

  showLinePreview(point: paper.Point, style: DrawStyle) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const preview = new scope.Path.Line(this.drawStartPoint, point);
    this.applyStroke(preview, style);
    this.showPreview(preview, 0.6);
  }

  commitLine(point: paper.Point, style: DrawStyle): paper.Item | null {
    if (!this.drawStartPoint) return null;
    if (this.drawStartPoint.getDistance(point) < 1) {
      this.drawStartPoint = null;
      return null;
    }
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const line = new scope.Path.Line(this.drawStartPoint, point);
    this.applyStroke(line, style);
    this.clearPreview();
    this.drawStartPoint = null;
    return line;
  }

  // ── Polyline ─────────────────────────────────────────────

  handlePolylineDown(point: paper.Point): paper.Item | null {
    this.polylinePoints.push(point);
    if (this.polylinePoints.length >= 2) {
      const first = this.polylinePoints[0];
      const dist = first.getDistance(point);
      if (dist < 5 / this.ctx.scope.view.zoom && this.polylinePoints.length > 2) {
        this.polylinePoints[this.polylinePoints.length - 1] = first;
        return this.finishPolyline(true);
      }
    }
    return null;
  }

  showPolylinePreview(point: paper.Point, style: DrawStyle) {
    this.clearPreview();
    if (this.polylinePoints.length === 0) return;
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const pts = [...this.polylinePoints, point];
    const preview = new scope.Path(pts.map((p) => new scope.Segment(p)));
    this.applyStroke(preview, style);
    this.showPreview(preview, 0.6);
  }

  finishPolyline(closed = false, style?: DrawStyle): paper.Item | null {
    if (this.polylinePoints.length < 2) {
      this.polylinePoints = [];
      this.polylinePath?.remove();
      this.polylinePath = null;
      this.clearPreview();
      return null;
    }
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const s = style ?? { strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 0.5, polygonSides: 6 };
    const path = new scope.Path(this.polylinePoints.map((p) => new scope.Segment(p)));
    path.closed = closed;
    this.applyStyle(path, s);
    this.polylinePoints = [];
    this.polylinePath?.remove();
    this.polylinePath = null;
    this.clearPreview();
    return path;
  }

  // ── Measure ──────────────────────────────────────────────

  measureStartPoint: paper.Point | null = null;

  clearMeasure() {
    this.clearPreview();
  }

  showMeasure(endPoint: paper.Point) {
    if (!this.measureStartPoint) return;
    this.clearPreview();
    showMeasurePreview(this.ctx, this.measureStartPoint, endPoint, (item) => {
      this.showPreview(item, 0.8);
    });
  }

  commitMeasure(endPoint: paper.Point, color: string): paper.Item | null {
    if (!this.measureStartPoint) return null;
    const start = this.measureStartPoint;
    this.clearMeasure();
    this.ctx.drawLayer.activate();
    const group = buildMeasureGroup(this.ctx, start, endPoint, color);
    this.measureStartPoint = null;
    return group;
  }

  commitMeasureBetween(a: paper.Point, b: paper.Point, color: string): paper.Item | null {
    this.clearMeasure();
    this.ctx.drawLayer.activate();
    return buildMeasureGroup(this.ctx, a, b, color);
  }

  // ── Arc (3-point) ────────────────────────────────────────

  showArcPreview(point: paper.Point, style: DrawStyle) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const preview = new scope.Path.Line(this.drawStartPoint, point);
    this.applyStroke(preview, style);
    this.showPreview(preview, 0.4);
  }

  commitArc(point: paper.Point, style: DrawStyle): paper.Item | null {
    if (!this.drawStartPoint) return null;
    if (!this.arcThrough) {
      this.arcThrough = point;
      return null;
    }
    if (this.drawStartPoint.getDistance(point) < 1) {
      this.drawStartPoint = null;
      this.arcThrough = null;
      return null;
    }
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const arc = new scope.Path.Arc(this.drawStartPoint, this.arcThrough, point);
    this.applyStroke(arc, style);
    this.clearPreview();
    this.drawStartPoint = null;
    this.arcThrough = null;
    return arc;
  }

  // ── Circle ───────────────────────────────────────────────

  showCirclePreview(point: paper.Point, style: DrawStyle) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const radius = this.drawStartPoint.getDistance(point);
    const preview = new scope.Path.Circle(this.drawStartPoint, radius);
    this.applyStyle(preview, style);
    this.showPreview(preview);
  }

  commitCircle(point: paper.Point, style: DrawStyle): paper.Item | null {
    if (!this.drawStartPoint) return null;
    const radius = this.drawStartPoint.getDistance(point);
    if (radius < 1) { this.drawStartPoint = null; return null; }
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const circle = new scope.Path.Circle(this.drawStartPoint, radius);
    this.applyStyle(circle, style);
    this.clearPreview();
    this.drawStartPoint = null;
    return circle;
  }

  // ── Ellipse ──────────────────────────────────────────────

  showEllipsePreview(point: paper.Point, style: DrawStyle) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const rect = new scope.Rectangle(this.drawStartPoint, point);
    const preview = new scope.Path.Ellipse(rect);
    this.applyStyle(preview, style);
    this.showPreview(preview);
  }

  commitEllipse(point: paper.Point, style: DrawStyle): paper.Item | null {
    if (!this.drawStartPoint) return null;
    const { scope } = this.ctx;
    const rect = new scope.Rectangle(this.drawStartPoint, point);
    if (rect.width < 1 && rect.height < 1) { this.drawStartPoint = null; return null; }
    this.ctx.drawLayer.activate();
    const ellipse = new scope.Path.Ellipse(rect);
    this.applyStyle(ellipse, style);
    this.clearPreview();
    this.drawStartPoint = null;
    return ellipse;
  }

  // ── Rectangle ────────────────────────────────────────────

  showRectanglePreview(point: paper.Point, style: DrawStyle) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const rect = new scope.Rectangle(this.drawStartPoint, point);
    const preview = new scope.Path.Rectangle(rect);
    this.applyStyle(preview, style);
    this.showPreview(preview);
  }

  commitRectangle(point: paper.Point, style: DrawStyle): paper.Item | null {
    if (!this.drawStartPoint) return null;
    const { scope } = this.ctx;
    const rect = new scope.Rectangle(this.drawStartPoint, point);
    if (rect.width < 1 && rect.height < 1) { this.drawStartPoint = null; return null; }
    this.ctx.drawLayer.activate();
    const rectangle = new scope.Path.Rectangle(rect);
    this.applyStyle(rectangle, style);
    this.clearPreview();
    this.drawStartPoint = null;
    return rectangle;
  }

  // ── Polygon ──────────────────────────────────────────────

  showPolygonPreview(point: paper.Point, style: DrawStyle) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const radius = this.drawStartPoint.getDistance(point);
    const preview = new scope.Path.RegularPolygon(this.drawStartPoint, style.polygonSides, radius);
    this.applyStyle(preview, style);
    this.showPreview(preview);
  }

  commitPolygon(point: paper.Point, style: DrawStyle): paper.Item | null {
    if (!this.drawStartPoint) return null;
    const radius = this.drawStartPoint.getDistance(point);
    if (radius < 1) { this.drawStartPoint = null; return null; }
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const polygon = new scope.Path.RegularPolygon(this.drawStartPoint, style.polygonSides, radius);
    this.applyStyle(polygon, style);
    this.clearPreview();
    this.drawStartPoint = null;
    return polygon;
  }

  // ── Dot ──────────────────────────────────────────────────

  handleDotDown(point: paper.Point, style: DrawStyle): paper.Item {
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const dot = new scope.Path.Circle(point, Math.max(style.strokeWidth, 0.5));
    dot.fillColor = new scope.Color(style.strokeColor);
    dot.strokeColor = null;
    dot.data = { isDot: true };
    return dot;
  }

  // ── Text ─────────────────────────────────────────────────

  showTextPreview(endPoint: paper.Point) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const rect = new scope.Rectangle(this.drawStartPoint, endPoint);
    const preview = new scope.Path.Rectangle(rect);
    preview.strokeColor = new scope.Color('#2196F3');
    preview.strokeWidth = 1 / scope.view.zoom;
    preview.dashArray = [3 / scope.view.zoom, 3 / scope.view.zoom];
    preview.fillColor = new scope.Color(0.13, 0.59, 0.95, 0.05);
    this.drawPreview = preview;
    this.ctx.drawLayer.activate();
  }

  commitText(endPoint: paper.Point, style: DrawStyle): paper.Item | null {
    if (!this.drawStartPoint) return null;
    const { scope } = this.ctx;
    const rect = new scope.Rectangle(this.drawStartPoint, endPoint);

    if (rect.width < 2 && rect.height < 2) {
      // Click without drag — default size
      this.clearPreview();
      this.ctx.drawLayer.activate();
      const textItem = new scope.PointText(this.drawStartPoint);
      textItem.content = 'txt';
      textItem.fillColor = new scope.Color(style.strokeColor);
      textItem.fontSize = 12;
      textItem.fontFamily = 'Helvetica, Arial, sans-serif';
      if (!textItem.data) textItem.data = {};
      textItem.data.textAlignH = 'left';
      textItem.data.textAlignV = 'top';
      this.drawStartPoint = null;
      return textItem;
    }

    this.clearPreview();
    this.ctx.drawLayer.activate();
    const fontSize = Math.max(4, rect.height * 0.8);
    const textItem = new scope.PointText(new scope.Point(rect.left, rect.top + fontSize));
    textItem.content = 'txt';
    textItem.fillColor = new scope.Color(style.strokeColor);
    textItem.fontSize = fontSize;
    textItem.fontFamily = 'Helvetica, Arial, sans-serif';
    if (!textItem.data) textItem.data = {};
    textItem.data.textAlignH = 'left';
    textItem.data.textAlignV = 'top';
    this.drawStartPoint = null;
    return textItem;
  }

  // ── Cut ──────────────────────────────────────────────────

  showCutPreview(point: paper.Point) {
    if (!this.drawStartPoint) return;
    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    const preview = new scope.Path.Line(this.drawStartPoint, point);
    preview.strokeColor = new scope.Color('#e53935');
    preview.strokeWidth = 1.5 / scope.view.zoom;
    preview.dashArray = [6 / scope.view.zoom, 4 / scope.view.zoom];
    this.showPreview(preview, 0.8);
  }
}
