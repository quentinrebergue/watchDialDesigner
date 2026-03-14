import type { EngineContext } from '../types';

interface TextArcState {
  text: string;
  anchorPoint: paper.Point;
  fontSize: number;
  fontFamily: string;
}

export interface TextArcData {
  isTextArc: true;
  text: string;
  centerX: number;
  centerY: number;
  radius: number;
  fontSize: number;
  fontFamily: string;
  letterSpacing: number;
  angularOffset: number;
}

/** Build a group of PointText chars placed along a circular arc. */
export function buildArcText(
  scope: paper.PaperScope,
  text: string,
  anchorPoint: paper.Point,
  centerPoint: paper.Point,
  fontSize: number,
  color: string,
  fontFamily = 'Helvetica, Arial, sans-serif',
  letterSpacing = 0,
  angularOffset = 0,
): paper.Group | null {
  const radius = anchorPoint.getDistance(centerPoint);
  if (radius < 2) return null;

  const col = new scope.Color(color);
  const group = new scope.Group();

  // Angular span per character (approximate based on font size & radius)
  const charWidth = fontSize * 0.6 + letterSpacing;
  const charAngle = (charWidth / radius) * (180 / Math.PI);

  // Total angular width of the text
  const totalAngle = charAngle * text.length;

  // Starting angle: center the text around the anchor angle
  const anchorAngle = Math.atan2(
    anchorPoint.y - centerPoint.y,
    anchorPoint.x - centerPoint.x,
  ) * (180 / Math.PI);

  const startAngle = anchorAngle + angularOffset - totalAngle / 2 + charAngle / 2;

  for (let i = 0; i < text.length; i++) {
    const angle = startAngle + i * charAngle;
    const rad = (angle * Math.PI) / 180;

    const x = centerPoint.x + radius * Math.cos(rad);
    const y = centerPoint.y + radius * Math.sin(rad);

    const charItem = new scope.PointText(new scope.Point(x, y));
    charItem.content = text[i];
    charItem.fillColor = col;
    charItem.fontSize = fontSize;
    charItem.fontFamily = fontFamily;
    charItem.justification = 'center';

    // Rotate character to be tangent to the arc (perpendicular to radius)
    charItem.rotation = angle + 90;

    group.addChild(charItem);
  }

  // Store arc metadata for editing
  const data: TextArcData = {
    isTextArc: true,
    text,
    centerX: centerPoint.x,
    centerY: centerPoint.y,
    radius,
    fontSize,
    fontFamily,
    letterSpacing,
    angularOffset,
  };
  group.data = data;

  return group;
}

/**
 * Text Arc tool: places individual characters along a circular arc.
 *
 * Workflow:
 * 1. User clicks an anchor point & enters text via prompt
 * 2. User moves the mouse to choose the arc center — live preview shown
 * 3. User clicks the center point to commit
 */
export class TextArcTool {
  private ctx: EngineContext;
  private preview: paper.Group | null = null;

  /** Set after step 1 (user placed anchor + typed text). */
  state: TextArcState | null = null;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
  }

  /** Step 1: record anchor and ask for text. Returns false if user cancelled. */
  beginArc(anchorPoint: paper.Point, _strokeColor: string): boolean {
    const text = prompt('Enter text for arc:');
    if (!text) return false;

    this.state = {
      text,
      anchorPoint,
      fontSize: 6,
      fontFamily: 'Helvetica, Arial, sans-serif',
    };
    return true;
  }

  /** Live preview while the user moves the mouse to choose the arc center. */
  showPreview(centerPoint: paper.Point, strokeColor: string) {
    if (!this.state) return;
    this.clearPreview();

    const { scope } = this.ctx;
    this.ctx.overlayLayer.activate();

    const group = buildArcText(
      scope,
      this.state.text,
      this.state.anchorPoint,
      centerPoint,
      this.state.fontSize,
      strokeColor,
      this.state.fontFamily,
    );
    if (group) {
      group.opacity = 0.5;
      this.preview = group;
    }

    this.ctx.drawLayer.activate();
  }

  /** Step 2: commit the arc text to the draw layer. */
  commit(centerPoint: paper.Point, strokeColor: string): paper.Item | null {
    if (!this.state) return null;

    this.clearPreview();
    const { scope } = this.ctx;
    this.ctx.drawLayer.activate();

    const group = buildArcText(
      scope,
      this.state.text,
      this.state.anchorPoint,
      centerPoint,
      this.state.fontSize,
      strokeColor,
      this.state.fontFamily,
    );

    this.state = null;
    return group;
  }

  clearPreview() {
    this.ctx.overlayLayer.activate();
    this.preview?.remove();
    this.preview = null;
    this.ctx.drawLayer.activate();
  }

  cancel() {
    this.clearPreview();
    this.state = null;
  }
}
