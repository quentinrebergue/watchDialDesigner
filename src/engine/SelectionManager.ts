import paper from 'paper';
import { MM_TO_PX, type EngineContext, type SelectionPropsPayload } from './types';
import { canPerformBoolean } from './selection/BooleanOps';
import { buildArcText, type TextArcData } from './tools/TextArcTool';

/**
 * Manages item selection, selection highlights, property gathering,
 * replace-mode, copy/paste, and the center-point overlay.
 */
export class SelectionManager {
  public ctx: EngineContext;

  // Selection state
  selectedItems: paper.Item[] = [];
  private selectionRect: paper.Path.Rectangle | null = null;
  isDraggingSelection = false;
  dragStart: paper.Point | null = null;
  marquee: paper.Path.Rectangle | null = null;

  // Vertex dragging
  dragSegment: paper.Segment | null = null;

  // Replace
  private _replaceSource: paper.Item | null = null;

  // Copy/paste
  private _clipboard: string | null = null;

  // Center point overlay
  private _showCenterPoint = false;
  private centerPointMarker: paper.Group | null = null;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
  }

  // ── Selection highlight ──────────────────────────────────

  updateSelectionHighlight() {
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    this.selectionRect?.remove();
    this.selectionRect = null;

    if (this.selectedItems.length > 0) {
      const bounds = this.getSelectionBounds();
      if (bounds) {
        this.selectionRect = new scope.Path.Rectangle(bounds);
        this.selectionRect.strokeColor = new scope.Color('#2196F3');
        this.selectionRect.strokeWidth = 1 / scope.view.zoom;
        this.selectionRect.dashArray = [4 / scope.view.zoom, 4 / scope.view.zoom];
        this.selectionRect.fillColor = null;
      }
    }

    this.ctx.drawLayer.activate();

    // Gather selection properties
    let props: SelectionPropsPayload | null = null;
    if (this.selectedItems.length > 0) {
      const bounds = this.getSelectionBounds();
      const first = this.selectedItems[0];
      const isText = this.selectedItems.length === 1 && first instanceof paper.PointText;
      const isTextArc = this.selectedItems.length === 1 && !!(first.data?.isTextArc);
      const textContent = isText
        ? (first as paper.PointText).content
        : isTextArc ? (first.data?.text ?? '') : '';
      const rotation = this.selectedItems.length === 1 ? (first.data?.rotation ?? 0) : 0;
      const strokeColor = first.strokeColor ? first.strokeColor.toCSS(true) : '#000000';
      const fillColor = first.fillColor ? first.fillColor.toCSS(true) : 'transparent';
      const strokeWidth = (first.strokeWidth ?? 1) / MM_TO_PX;
      const textAlignH: 'left' | 'center' | 'right' = isText ? (first.data?.textAlignH ?? 'left') : 'left';
      const textAlignV: 'top' | 'center' | 'bottom' = isText ? (first.data?.textAlignV ?? 'top') : 'top';
      const fontFamily = isText
        ? ((first as paper.PointText).fontFamily ?? 'Helvetica, Arial, sans-serif')
        : isTextArc ? (first.data?.fontFamily ?? 'Helvetica, Arial, sans-serif') : 'Helvetica, Arial, sans-serif';
      const fontSize = isText
        ? ((first as paper.PointText).fontSize as number ?? 12)
        : isTextArc ? (first.data?.fontSize ?? 6) : 12;
      const letterSpacing = isText
        ? (first.data?.letterSpacing ?? 0)
        : isTextArc ? (first.data?.letterSpacing ?? 0) : 0;
      const textArcRotation = isTextArc ? (first.data?.angularOffset ?? 0) : 0;
      const cornerRadius = this.selectedItems.length === 1 ? (first.data?.cornerRadius ?? 0) : 0;
      props = {
        x: bounds ? bounds.center.x / MM_TO_PX : 0,
        y: bounds ? bounds.center.y / MM_TO_PX : 0,
        width: bounds ? bounds.width / MM_TO_PX : 0,
        height: bounds ? bounds.height / MM_TO_PX : 0,
        rotation, isText, textContent,
        strokeColor, fillColor, strokeWidth,
        textAlignH, textAlignV,
        canBoolean: canPerformBoolean(this.selectedItems),
        fontFamily, fontSize,
        isTextArc, letterSpacing, textArcRotation,
        cornerRadius,
      };
    }
    this.ctx.callbacks.onSelectionChange?.(this.selectedItems.length, props);
    this.updateCenterPointMarker();
  }

  private getSelectionBounds(): paper.Rectangle | null {
    let bounds: paper.Rectangle | null = null;
    for (const item of this.selectedItems) {
      if (!bounds) bounds = item.bounds.clone();
      else bounds = bounds.unite(item.bounds);
    }
    return bounds;
  }

  // ── Select / deselect ────────────────────────────────────

  deselectAll() {
    this.selectedItems.forEach((item) => { item.selected = false; });
    this.selectedItems = [];
    this.updateSelectionHighlight();
  }

  selectItem(item: paper.Item, addToSelection = false) {
    if (!addToSelection) this.deselectAll();
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
      item.selected = true;
    }
    this.updateSelectionHighlight();
  }

  // ── Delete / Duplicate ───────────────────────────────────

  deleteSelected(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    this.selectedItems.forEach((item) => item.remove());
    this.selectedItems = [];
    this.updateSelectionHighlight();
  }

  duplicateSelected(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    this.ctx.drawLayer.activate();
    const newItems: paper.Item[] = [];
    this.selectedItems.forEach((item) => {
      const clone = item.clone();
      clone.position = clone.position.add(new this.ctx.scope.Point(5, 5));
      newItems.push(clone);
    });
    this.deselectAll();
    newItems.forEach((item) => this.selectItem(item, true));
  }

  // ── Replace mode ─────────────────────────────────────────

  startReplaceMode() {
    if (this.selectedItems.length !== 1) return;
    this._replaceSource = this.selectedItems[0];
    this.ctx.canvas.style.cursor = 'crosshair';
  }

  get replaceSource() { return this._replaceSource; }

  clearReplaceMode() {
    this._replaceSource = null;
    this.ctx.canvas.style.cursor = 'default';
  }

  replaceItemWith(target: paper.Item, source: paper.Item, pushUndo: () => void) {
    pushUndo();
    this.ctx.drawLayer.activate();
    const targetCenter = target.bounds.center.clone();
    const targetWidth = target.bounds.width;
    const targetHeight = target.bounds.height;
    const targetRotation = target.data?.rotation ?? 0;

    const clone = source.clone();
    const sourceRotation = source.data?.rotation ?? 0;
    if (Math.abs(sourceRotation) > 0.001) {
      clone.rotate(-sourceRotation, clone.bounds.center);
    }
    if (clone.bounds.width > 0 && clone.bounds.height > 0) {
      const sx = targetWidth / clone.bounds.width;
      const sy = targetHeight / clone.bounds.height;
      clone.scale(sx, sy, clone.bounds.center);
    }
    clone.position = targetCenter;
    if (Math.abs(targetRotation) > 0.001) {
      clone.rotate(targetRotation, clone.bounds.center);
    }
    if (!clone.data) clone.data = {};
    clone.data.rotation = targetRotation;
    target.remove();
    this.deselectAll();
    this.selectItem(clone);
  }

  // ── Copy / Paste ─────────────────────────────────────────

  copySelected() {
    if (this.selectedItems.length === 0) return;
    const { scope } = this.ctx;
    const group = new scope.Group(this.selectedItems.map((i) => i.clone()));
    this._clipboard = group.exportJSON();
    group.remove();
  }

  paste(pushUndo: () => void, snapEnabled: boolean, snapGrid: boolean, snapSpacing: number) {
    if (!this._clipboard) return;
    pushUndo();
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();
    const group = new scope.Group();
    group.importJSON(this._clipboard);
    const offset = snapEnabled && snapGrid ? snapSpacing * MM_TO_PX : 5;
    const items: paper.Item[] = [];
    const children = [...group.children];
    children.forEach((child) => {
      child.position = child.position.add(new scope.Point(offset, offset));
      this.ctx.drawLayer.addChild(child);
      items.push(child);
    });
    group.remove();
    this.deselectAll();
    items.forEach((item) => this.selectItem(item, true));
  }

  // ── Property setters ─────────────────────────────────────

  setPosition(xMm: number, yMm: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    const newCenter = new scope.Point(xMm * MM_TO_PX, yMm * MM_TO_PX);
    if (this.selectedItems.length === 1) {
      this.selectedItems[0].position = newCenter;
    } else {
      const bounds = this.getSelectionBounds();
      if (bounds) {
        const delta = newCenter.subtract(bounds.center);
        this.selectedItems.forEach((item) => { item.position = item.position.add(delta); });
      }
    }
    this.updateSelectionHighlight();
  }

  centerHorizontally(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => {
      item.position = new scope.Point(0, item.position.y);
    });
    this.updateSelectionHighlight();
  }

  centerVertically(pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => {
      item.position = new scope.Point(item.position.x, 0);
    });
    this.updateSelectionHighlight();
  }

  setSize(wMm: number, hMm: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const bounds = this.getSelectionBounds();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;
    const sx = (wMm * MM_TO_PX) / bounds.width;
    const sy = (hMm * MM_TO_PX) / bounds.height;
    this.selectedItems.forEach((item) => { item.scale(sx, sy, bounds!.center); });
    this.updateSelectionHighlight();
  }

  setRotation(degrees: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    const clamped = Math.max(-360, Math.min(360, degrees));
    const current = this.selectedItems.length === 1 ? (this.selectedItems[0].data?.rotation ?? 0) : 0;
    const delta = clamped - current;
    if (Math.abs(delta) < 0.001) return;
    const bounds = this.getSelectionBounds();
    const center = bounds?.center ?? new scope.Point(0, 0);
    this.selectedItems.forEach((item) => {
      item.rotate(delta, center);
      if (!item.data) item.data = {};
      item.data.rotation = clamped;
    });
    this.updateSelectionHighlight();
  }

  setTextContent(text: string, pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (item instanceof paper.PointText) {
      pushUndo();
      item.content = text;
      this.updateSelectionHighlight();
      return;
    }
    if (item.data?.isTextArc) {
      this.rebuildTextArc(item, { text }, pushUndo);
    }
  }

  setStrokeColor(color: string, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => { item.strokeColor = new scope.Color(color); });
    this.updateSelectionHighlight();
  }

  setFillColor(color: string, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const { scope } = this.ctx;
    this.selectedItems.forEach((item) => {
      item.fillColor = color === 'transparent' ? null : new scope.Color(color);
    });
    this.updateSelectionHighlight();
  }

  setStrokeWidth(widthMm: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    this.selectedItems.forEach((item) => { item.strokeWidth = widthMm * MM_TO_PX; });
    this.updateSelectionHighlight();
  }

  setCornerRadius(radiusMm: number, pushUndo: () => void) {
    if (this.selectedItems.length === 0) return;
    pushUndo();
    const radiusPx = radiusMm * MM_TO_PX;
    for (const item of this.selectedItems) {
      if (!(item instanceof paper.Path)) continue;
      // Restore original geometry if we've previously rounded
      if (item.data?._originalSegments) {
        item.removeSegments();
        for (const seg of item.data._originalSegments) {
          item.add(new this.ctx.scope.Segment(
            new this.ctx.scope.Point(seg.point),
            seg.handleIn ? new this.ctx.scope.Point(seg.handleIn) : undefined,
            seg.handleOut ? new this.ctx.scope.Point(seg.handleOut) : undefined,
          ));
        }
        item.closed = item.data._originalClosed;
      }
      if (!item.data) item.data = {};
      // Save original geometry before rounding
      item.data._originalSegments = item.segments.map((s: paper.Segment) => ({
        point: { x: s.point.x, y: s.point.y },
        handleIn: s.handleIn ? { x: s.handleIn.x, y: s.handleIn.y } : null,
        handleOut: s.handleOut ? { x: s.handleOut.x, y: s.handleOut.y } : null,
      }));
      item.data._originalClosed = item.closed;
      item.data.cornerRadius = radiusMm;
      if (radiusPx > 0) {
        this.applyFillet(item, radiusPx);
      }
    }
    this.updateSelectionHighlight();
  }

  /** Apply fillet (rounded corners) to a path. */
  private applyFillet(path: paper.Path, radius: number) {
    const segs = [...path.segments];
    const closed = path.closed;
    const count = segs.length;
    if (count < 2) return;

    const newSegments: paper.Segment[] = [];
    const start = closed ? 0 : 1;
    const end = closed ? count : count - 1;

    // For open paths, keep the first point as-is
    if (!closed) {
      newSegments.push(segs[0].clone());
    }

    for (let i = start; i < end; i++) {
      const prev = segs[(i - 1 + count) % count];
      const curr = segs[i];
      const next = segs[(i + 1) % count];

      // Only fillet corners that have no handles (sharp corners)
      if ((curr.handleIn.length > 0.1 || curr.handleOut.length > 0.1)) {
        newSegments.push(curr.clone());
        continue;
      }

      const dirIn = prev.point.subtract(curr.point);
      const dirOut = next.point.subtract(curr.point);
      const lenIn = dirIn.length;
      const lenOut = dirOut.length;

      if (lenIn < 0.01 || lenOut < 0.01) {
        newSegments.push(curr.clone());
        continue;
      }

      // Clamp radius to half the shortest edge
      const r = Math.min(radius, lenIn / 2, lenOut / 2);
      if (r < 0.01) {
        newSegments.push(curr.clone());
        continue;
      }

      const unitIn = dirIn.normalize();
      const unitOut = dirOut.normalize();

      // Points where the arc starts/ends
      const pStart = curr.point.add(unitIn.multiply(r));
      const pEnd = curr.point.add(unitOut.multiply(r));

      // Cubic bezier handle length for a circular arc approximation
      const dot = unitIn.dot(unitOut);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      const handleLen = (4 / 3) * Math.tan(angle / 4) * r;

      const hOut = unitIn.normalize(-handleLen);
      const hIn = unitOut.normalize(-handleLen);

      newSegments.push(new this.ctx.scope.Segment(pStart, undefined, hOut));
      newSegments.push(new this.ctx.scope.Segment(pEnd, hIn, undefined));
    }

    // For open paths, keep the last point as-is
    if (!closed) {
      newSegments.push(segs[count - 1].clone());
    }

    path.removeSegments();
    for (const seg of newSegments) {
      path.add(seg);
    }
    path.closed = closed;
  }

  setTextAlignH(align: 'left' | 'center' | 'right', pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (!(item instanceof paper.PointText)) return;
    pushUndo();
    item.justification = align;
    if (!item.data) item.data = {};
    item.data.textAlignH = align;
    this.updateSelectionHighlight();
  }

  setTextAlignV(align: 'top' | 'center' | 'bottom', pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (!(item instanceof paper.PointText)) return;
    pushUndo();
    if (!item.data) item.data = {};
    item.data.textAlignV = align;
    this.updateSelectionHighlight();
  }

  setFontFamily(fontFamily: string, pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (item instanceof paper.PointText) {
      pushUndo();
      item.fontFamily = fontFamily;
      this.updateSelectionHighlight();
      return;
    }
    if (item.data?.isTextArc) {
      this.rebuildTextArc(item, { fontFamily }, pushUndo);
    }
  }

  setFontSize(fontSize: number, pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (item instanceof paper.PointText) {
      pushUndo();
      item.fontSize = fontSize;
      this.updateSelectionHighlight();
      return;
    }
    if (item.data?.isTextArc) {
      this.rebuildTextArc(item, { fontSize }, pushUndo);
    }
  }

  setLetterSpacing(spacing: number, pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (item instanceof paper.PointText) {
      pushUndo();
      if (!item.data) item.data = {};
      item.data.letterSpacing = spacing;
      // Paper.js PointText doesn't natively support letter-spacing,
      // but we store it for export / SVG usage
      this.updateSelectionHighlight();
      return;
    }
    if (item.data?.isTextArc) {
      this.rebuildTextArc(item, { letterSpacing: spacing }, pushUndo);
    }
  }

  setTextArcRotation(degrees: number, pushUndo: () => void) {
    if (this.selectedItems.length !== 1) return;
    const item = this.selectedItems[0];
    if (!item.data?.isTextArc) return;
    this.rebuildTextArc(item, { angularOffset: degrees }, pushUndo);
  }

  /** Update a textArc property and rebuild the group in-place. */
  private rebuildTextArc(
    item: paper.Item,
    overrides: Partial<TextArcData>,
    pushUndo: () => void,
  ) {
    pushUndo();
    const d = item.data as TextArcData;
    const text = overrides.text ?? d.text;
    const fontSize = overrides.fontSize ?? d.fontSize;
    const fontFamily = overrides.fontFamily ?? d.fontFamily;
    const letterSpacing = overrides.letterSpacing ?? d.letterSpacing;
    const angularOffset = overrides.angularOffset ?? d.angularOffset;

    const { scope } = this.ctx;
    const centerPoint = new scope.Point(d.centerX, d.centerY);
    // Compute the original anchor from stored center + radius + anchor angle (0° of text center)
    const anchorAngle = Math.atan2(
      (item.data as TextArcData).centerY === d.centerY ? 0 : 0,
      0,
    );
    // Original anchor: use center + radius at the original angle (before offset)
    // We store centerX/Y and radius; recompute anchor from the original anchor direction.
    // The anchor is at angle = anchorAngle (the middle of the text before offset).
    // Since we centered the text around anchorAngle, we can derive it:
    // anchorAngle = atan2(anchor.y - center.y, anchor.x - center.x)
    // But we don't store anchorAngle directly. Let's store it now.
    // For backward compatibility, derive from the first char position if available.
    const anchorPt = this.deriveAnchorPoint(item, d, scope);

    const color = item.children?.length > 0 && item.children[0].fillColor
      ? item.children[0].fillColor.toCSS(true)
      : '#000000';

    this.ctx.drawLayer.activate();
    const newGroup = buildArcText(
      scope, text, anchorPt, centerPoint,
      fontSize, color, fontFamily, letterSpacing, angularOffset,
    );

    if (newGroup) {
      // preserve position in layer
      const parent = item.parent;
      const idx = item.index;
      item.remove();
      parent.insertChild(idx, newGroup);
      this.selectedItems = [newGroup];
      newGroup.selected = true;
    }

    this.updateSelectionHighlight();
  }

  /** Derive the original anchor point from textArc data. */
  private deriveAnchorPoint(
    item: paper.Item,
    d: TextArcData,
    scope: paper.PaperScope,
  ): paper.Point {
    // Compute the mid-angle of the current text (without angular offset).
    // The mid-char angle = anchorAngle (the original click direction).
    // From buildArcText: startAngle = anchorAngle + offset - total/2 + charAngle/2
    // middleCharIndex = (n-1)/2 → angle of middle char ≈ anchorAngle + offset
    // So anchorAngle ≈ middleCharAngle - offset
    // Without stored anchorAngle, we reconstruct from the first child if present.
    if (item instanceof paper.Group && item.children.length > 0) {
      const charWidth = d.fontSize * 0.6 + d.letterSpacing;
      const charAngle = (charWidth / d.radius) * (180 / Math.PI);
      const totalAngle = charAngle * d.text.length;
      // first char is at startAngle = anchorAngle + offset - total/2 + charAngle/2
      // → anchorAngle = first.rotation - 90 - offset + total/2 - charAngle/2
      // (since each char's rotation = angle + 90)
      const firstRotation = item.children[0].rotation ?? 0;
      const anchorAngleDeg = firstRotation - 90 - d.angularOffset + totalAngle / 2 - charAngle / 2;
      const rad = (anchorAngleDeg * Math.PI) / 180;
      return new scope.Point(
        d.centerX + d.radius * Math.cos(rad),
        d.centerY + d.radius * Math.sin(rad),
      );
    }
    // Fallback: anchor straight above center
    return new scope.Point(d.centerX, d.centerY - d.radius);
  }

  // ── Radial clone / mirror ────────────────────────────────

  // ── Center point overlay ─────────────────────────────────

  setShowCenterPoint(show: boolean) {
    this._showCenterPoint = show;
    this.updateCenterPointMarker();
  }

  private updateCenterPointMarker() {
    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();
    this.centerPointMarker?.remove();
    this.centerPointMarker = null;

    if (this._showCenterPoint && this.selectedItems.length > 0) {
      const bounds = this.getSelectionBounds();
      if (bounds) {
        const center = bounds.center;
        const size = 6 / scope.view.zoom;
        const group = new scope.Group();
        const h = new scope.Path.Line(
          new scope.Point(center.x - size, center.y),
          new scope.Point(center.x + size, center.y),
        );
        h.strokeColor = new scope.Color('#e53935');
        h.strokeWidth = 1 / scope.view.zoom;
        const v = new scope.Path.Line(
          new scope.Point(center.x, center.y - size),
          new scope.Point(center.x, center.y + size),
        );
        v.strokeColor = new scope.Color('#e53935');
        v.strokeWidth = 1 / scope.view.zoom;
        const c = new scope.Path.Circle(center, size * 0.4);
        c.strokeColor = new scope.Color('#e53935');
        c.strokeWidth = 1 / scope.view.zoom;
        c.fillColor = null;
        group.addChild(h);
        group.addChild(v);
        group.addChild(c);
        this.centerPointMarker = group;
      }
    }

    this.ctx.drawLayer.activate();
  }
}
