import paper from 'paper';
import type { SnapSettings, GridSettings, MeasureSnapMode } from '../store';
import { MM_TO_PX, type EngineContext } from './types';

/**
 * Handles snapping cursor positions to the grid, existing points, and angular steps.
 */
export class SnapManager {
  private ctx: EngineContext;
  private _snap: SnapSettings = { mode: 'grid', angularStep: 6 };
  private _gridSettings: GridSettings = {
    showPolar: true,
    showCartesian: false,
    polarCircleSpacing: 1,
    polarAngleSpacing: 6,
    cartesianSpacing: 1,
    snapSpacing: 1,
  };

  // Smart snap guide lines (drawn on overlay layer)
  private smartGuides: paper.Item[] = [];

  // Snap indicator (shown on overlay)
  private snapIndicator: paper.Item | null = null;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
  }

  get snap() { return this._snap; }
  get gridSettings() { return this._gridSettings; }

  setSnap(s: SnapSettings) { this._snap = s; }
  setGridSettings(s: GridSettings) { this._gridSettings = s; }

  /** Clear rendered smart snap guide lines. */
  clearSmartGuides() {
    for (const g of this.smartGuides) g.remove();
    this.smartGuides = [];
    this.clearSnapIndicator();
  }

  /** Clear snap indicator dot. */
  clearSnapIndicator() {
    this.snapIndicator?.remove();
    this.snapIndicator = null;
  }

  /** Show a snap indicator at a point. Blue = segment, green = curve. */
  private showSnapIndicator(point: paper.Point, type: 'segment' | 'curve') {
    this.clearSnapIndicator();
    const { scope } = this.ctx;
    const prevActive = scope.project.activeLayer;
    this.ctx.overlayLayer.activate();

    const color = new scope.Color(type === 'segment' ? '#2196F3' : '#4CAF50');
    const group = new scope.Group();

    // Outer ring
    const ringRadius = 6 / scope.view.zoom;
    const ring = new scope.Path.Circle(point, ringRadius);
    ring.strokeColor = color;
    ring.strokeWidth = 2 / scope.view.zoom;
    ring.fillColor = color.clone();
    ring.fillColor.alpha = 0.15;
    group.addChild(ring);

    // Crosshair lines
    const armLen = 10 / scope.view.zoom;
    const gap = 7 / scope.view.zoom;
    const sw = 1.5 / scope.view.zoom;
    const arms = [
      [new scope.Point(point.x - armLen, point.y), new scope.Point(point.x - gap, point.y)],
      [new scope.Point(point.x + gap, point.y), new scope.Point(point.x + armLen, point.y)],
      [new scope.Point(point.x, point.y - armLen), new scope.Point(point.x, point.y - gap)],
      [new scope.Point(point.x, point.y + gap), new scope.Point(point.x, point.y + armLen)],
    ];
    for (const [a, b] of arms) {
      const arm = new scope.Path.Line(a, b);
      arm.strokeColor = color;
      arm.strokeWidth = sw;
      group.addChild(arm);
    }

    // Center dot
    const dot = new scope.Path.Circle(point, 1.5 / scope.view.zoom);
    dot.fillColor = color;
    dot.strokeColor = null;
    group.addChild(dot);

    this.snapIndicator = group;
    prevActive.activate();
  }

  snapPoint(point: paper.Point, excludeItems?: paper.Item[]): paper.Point {
    const { scope } = this.ctx;

    let snapped = point.clone();
    let snapType: 'segment' | 'curve' | null = null;

    // Point snap is always active (highest priority)
    let minDist = 5 / scope.view.zoom; // 5px tolerance in view coords
    this.ctx.drawLayer.children.forEach((item) => {
      if (excludeItems && excludeItems.includes(item)) return;
      if (item instanceof paper.Path) {
        item.segments?.forEach((seg) => {
          const d = seg.point.getDistance(point);
          if (d < minDist) {
            minDist = d;
            snapped = seg.point.clone();
            snapType = 'segment';
          }
        });
        if (item.bounds) {
          const d = item.bounds.center.getDistance(point);
          if (d < minDist) {
            minDist = d;
            snapped = item.bounds.center.clone();
            snapType = 'segment';
          }
        }
      }
    });

    // Curve snap: if no segment snap found, snap to nearest point on any path
    if (!snapType) {
      let curveMinDist = 5 / scope.view.zoom;
      this.ctx.drawLayer.children.forEach((item) => {
        if (excludeItems && excludeItems.includes(item)) return;
        if (item instanceof paper.Path && item.segments && item.segments.length >= 2) {
          const nearest = item.getNearestPoint(point);
          const d = nearest.getDistance(point);
          if (d < curveMinDist) {
            curveMinDist = d;
            snapped = nearest;
            snapType = 'curve';
          }
        }
      });
    }

    // Show snap indicator
    if (snapType) {
      this.showSnapIndicator(snapped, snapType);
    } else {
      this.clearSnapIndicator();
    }

    // Secondary snap: grid rounds coordinates, angular constrains angle
    // Point snap takes priority — if a point was hit, skip secondary snap
    if (!snapType) {
      switch (this._snap.mode) {
        case 'grid': {
          const gridSize = this._gridSettings.snapSpacing * MM_TO_PX;
          snapped = new scope.Point(
            Math.round(snapped.x / gridSize) * gridSize,
            Math.round(snapped.y / gridSize) * gridSize,
          );
          break;
        }
        case 'angular': {
          if (this._snap.angularStep > 0) {
            const angle = Math.atan2(snapped.y, snapped.x) * (180 / Math.PI);
            const step = this._snap.angularStep;
            const snappedAngle = Math.round(angle / step) * step;
            const dist = snapped.getDistance(new scope.Point(0, 0));
            const distFromSnappedAngle = Math.abs(angle - snappedAngle);
            if (distFromSnappedAngle < 2) {
              const rad = (snappedAngle * Math.PI) / 180;
              snapped = new scope.Point(Math.cos(rad) * dist, Math.sin(rad) * dist);
            }
          }
          break;
        }
        // 'free': no secondary snap
      }
    }

    return snapped;
  }

  /** @deprecated Smart snap removed — kept private for potential future use. */
  private applySmartSnap(point: paper.Point, excludeItems?: paper.Item[]): paper.Point {
    const { scope } = this.ctx;
    this.clearSmartGuides();

    const tolerance = 5 / scope.view.zoom;
    const extent = 5000; // large extent for guide lines
    let snappedX = point.x;
    let snappedY = point.y;
    let didSnapX = false;
    let didSnapY = false;

    // Collect reference points from all objects in draw layer
    const refXs: number[] = [];
    const refYs: number[] = [];

    this.ctx.drawLayer.children.forEach((item) => {
      if (excludeItems && excludeItems.includes(item)) return;
      const b = item.bounds;
      if (!b) return;
      // Center
      refXs.push(b.center.x);
      refYs.push(b.center.y);
      // Edges
      refXs.push(b.left, b.right);
      refYs.push(b.top, b.bottom);
    });

    // Also snap to dial center (0,0)
    refXs.push(0);
    refYs.push(0);

    // Find closest X alignment
    let bestDx = tolerance;
    for (const rx of refXs) {
      const dx = Math.abs(point.x - rx);
      if (dx < bestDx) {
        bestDx = dx;
        snappedX = rx;
        didSnapX = true;
      }
    }

    // Find closest Y alignment
    let bestDy = tolerance;
    for (const ry of refYs) {
      const dy = Math.abs(point.y - ry);
      if (dy < bestDy) {
        bestDy = dy;
        snappedY = ry;
        didSnapY = true;
      }
    }

    // Draw guide lines on overlay layer
    const prevActive = scope.project.activeLayer;
    this.ctx.overlayLayer.activate();
    const guideColor = new scope.Color('#2196F3');
    guideColor.alpha = 0.5;
    const sw = 0.5 / scope.view.zoom;

    if (didSnapX) {
      const line = new scope.Path.Line(
        new scope.Point(snappedX, -extent),
        new scope.Point(snappedX, extent)
      );
      line.strokeColor = guideColor;
      line.strokeWidth = sw;
      line.dashArray = [4 / scope.view.zoom, 4 / scope.view.zoom];
      this.smartGuides.push(line);
    }

    if (didSnapY) {
      const line = new scope.Path.Line(
        new scope.Point(-extent, snappedY),
        new scope.Point(extent, snappedY)
      );
      line.strokeColor = guideColor;
      line.strokeWidth = sw;
      line.dashArray = [4 / scope.view.zoom, 4 / scope.view.zoom];
      this.smartGuides.push(line);
    }

    prevActive.activate();

    return new scope.Point(snappedX, snappedY);
  }

  /**
   * Snap a point specifically for the measure tool, using its own snap mode.
   * - 'free'       → no snapping (raw point)
   * - 'radial'     → snap angle to polar grid, distance unconstrained
   * - 'cartesian'  → snap to cartesian grid intersections
   */
  snapPointForMeasure(point: paper.Point, mode: MeasureSnapMode): paper.Point {
    const { scope } = this.ctx;

    // Always snap to existing points first (nearest endpoint / center)
    let snapped = point.clone();
    {
      let minDist = 5 / scope.view.zoom;
      this.ctx.drawLayer.children.forEach((item) => {
        if (item instanceof paper.Path) {
          item.segments?.forEach((seg) => {
            const d = seg.point.getDistance(point);
            if (d < minDist) { minDist = d; snapped = seg.point.clone(); }
          });
          if (item.bounds) {
            const d = item.bounds.center.getDistance(point);
            if (d < minDist) { minDist = d; snapped = item.bounds.center.clone(); }
          }
        }
      });
    }

    if (mode === 'free') return snapped;

    if (mode === 'cartesian') {
      const gridSize = this._gridSettings.snapSpacing * MM_TO_PX;
      return new scope.Point(
        Math.round(snapped.x / gridSize) * gridSize,
        Math.round(snapped.y / gridSize) * gridSize,
      );
    }

    // mode === 'radial'
    const step = this._gridSettings.polarAngleSpacing;
    if (step > 0) {
      const angle = Math.atan2(snapped.y, snapped.x) * (180 / Math.PI);
      const snappedAngle = Math.round(angle / step) * step;
      const dist = snapped.getDistance(new scope.Point(0, 0));
      // Snap distance to polar circle spacing
      const circleSpacing = this._gridSettings.polarCircleSpacing * MM_TO_PX;
      const snappedDist = Math.round(dist / circleSpacing) * circleSpacing;
      const rad = (snappedAngle * Math.PI) / 180;
      return new scope.Point(Math.cos(rad) * snappedDist, Math.sin(rad) * snappedDist);
    }

    return snapped;
  }
}
