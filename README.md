# Watch Dial Designer

A browser-based **vector graphics editor** purpose-built for designing watch dials. It provides a millimeter-accurate canvas with polar/cartesian grids, intelligent snapping, and SVG export — everything a watchmaker or dial designer needs to lay out indices, numerals, and dial features with precision.

![Stack](https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?logo=vite&logoColor=white)
![Paper.js](https://img.shields.io/badge/Paper.js-F7DF1E)

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Tech Stack](#tech-stack)
- [Commands Reference](#commands-reference)
- [Engine Deep Dive](#engine-deep-dive)
- [Component Documentation](#component-documentation)
- [Feature Checklist](#feature-checklist)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

---

## Project Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        React UI                              │
│  Toolbar ─ ToolStylePanel ─ PropertiesPanel ─ StatusBar      │
│       │          │                 │              │           │
│       └──────────┴────────┬────────┘              │           │
│                           ▼                       │           │
│                    Zustand Store                   │           │
│              (single source of truth)              │           │
│                    │          ▲                    │           │
│            sync    │          │ callbacks          │           │
│                    ▼          │                    │           │
│  ┌─────────────────────────────────────────────┐  │           │
│  │             CanvasEngine (orchestrator)      │  │           │
│  │  ┌──────────────┬──────────────┬──────────┐ │  │           │
│  │  │ GridRenderer  │ SnapManager  │ Drawing- │ │  │           │
│  │  │              │              │ Tools    │ │  │           │
│  │  └──────────────┴──────────────┴──────────┘ │  │           │
│  │  ┌──────────────────────────────────────────┐│  │           │
│  │  │          SelectionManager                ││  │           │
│  │  └──────────────────────────────────────────┘│  │           │
│  └─────────────────────────────────────────────┘  │           │
│                        │                          │           │
│                   Paper.js canvas                 │           │
└──────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── App.tsx                        # Root layout — composes all top-level components
├── main.tsx                       # Vite entry point
├── index.css                      # Tailwind directives + global styles
├── store.ts                       # Zustand store — all application state
│
├── engine/                        # Paper.js rendering engine (no React)
│   ├── types.ts                   # Shared types: MM_TO_PX, EngineContext, callbacks
│   ├── CanvasEngine.ts            # Orchestrator — wires events to sub-modules
│   ├── GridRenderer.ts            # Polar & cartesian grid drawing
│   ├── SnapManager.ts             # Grid, point, angular snapping
│   ├── SelectionManager.ts        # Selection, transforms, clipboard, replace
│   ├── DrawingTools.ts            # Shape creation (line, circle, text, etc.)
│   └── index.ts                   # Barrel export
│
├── components/
│   ├── Sketch.tsx                 # Canvas host — creates engine, syncs state
│   ├── Toolbar.tsx                # Left sidebar — tool & action buttons
│   ├── ToolStylePanel.tsx         # Contextual style panel for drawing tools
│   ├── PropertiesPanel.tsx        # Right sidebar — composes sub-panels
│   ├── StatusBar.tsx              # Bottom bar — tool name, dial size, zoom
│   ├── HelpTooltip.tsx            # Bottom hint bar — keyboard shortcuts
│   └── panels/                    # PropertiesPanel sub-components
│       ├── Panel.tsx              # Reusable collapsible panel + Field component
│       ├── DialPanel.tsx          # Dial diameter & fit-to-view
│       ├── GridPanel.tsx          # Grid type & spacing controls
│       ├── SnapPanel.tsx          # Snap toggle, grid/points/angular settings
│       ├── LayersPanel.tsx        # Layer management (add, remove, visibility, lock)
│       ├── SelectionPanel.tsx     # Position, size, rotation, stroke, fill, text, replace
│       └── index.ts              # Barrel export
│
├── test/
│   ├── setup.ts                   # Vitest + @testing-library/jest-dom setup
│   ├── store.test.ts              # 9 tests — Zustand store operations
│   └── engine.test.ts             # 2 tests — engine constants
│
.github/workflows/
└── ci.yml                         # GitHub Actions: typecheck → lint → format → test → build
```

### Layered Canvas Architecture

The Paper.js canvas uses **4 separate layers**, bottom to top:

| Layer          | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `gridLayer`    | Background grid (polar circles, radial lines, cartesian) |
| `dialLayer`    | White dial circle with border and center cross           |
| `drawLayer`    | All user-created shapes (the actual design)              |
| `overlayLayer` | Tool previews, selection highlights, center point marker |

### State Management Pattern

**Zustand → Engine sync** (one-directional push):

- `Sketch.tsx` subscribes to Zustand store slices via `useEffect`
- When store values change, Sketch calls engine setters (e.g., `engine.setDiameter()`)
- The engine never reads from the store directly

**Engine → Store callbacks** (event-driven):

- Engine reports changes via `EngineCallbacks` interface:
  - `onSelectionChange(count, props)` — selection state
  - `onPushUndo(json)` — undo snapshots
  - `onZoomChange(zoom)` — zoom level
  - `onToolChange(tool)` — auto-switch to select after drawing

---

## Tech Stack

### Runtime

| Library      | Version | Purpose                                 |
| ------------ | ------- | --------------------------------------- |
| React        | 18.3    | UI components                           |
| TypeScript   | ~5.6    | Type safety                             |
| Vite         | 6.1     | Dev server & bundler                    |
| Tailwind CSS | 3.4     | Utility-first styling                   |
| Paper.js     | 0.12    | 2D vector graphics engine (HTML Canvas) |
| Zustand      | 5.0     | Lightweight global state management     |
| Lucide React | 0.475   | Icon library                            |

### Development

| Tool            | Version | Purpose                 |
| --------------- | ------- | ----------------------- |
| ESLint          | 9.39    | Linting (flat config)   |
| Prettier        | 3.8     | Code formatting         |
| Vitest          | 4.0     | Unit testing            |
| Testing Library | 16.3    | React component testing |
| GitHub Actions  | —       | CI/CD pipeline          |

---

## Commands Reference

### Development

```bash
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # TypeScript check + production build
npm run preview          # Preview production build locally
```

### Code Quality

```bash
npm run typecheck        # Run tsc --noEmit (type checking only)
npm run lint             # Run ESLint across the project
npm run format           # Format all src/ files with Prettier
npm run format:check     # Check formatting without writing
```

### Testing

```bash
npm test                 # Run all tests once (vitest run)
npm run test:watch       # Run tests in watch mode (vitest)
```

### Dead Code & Duplication Analysis

These tools are not in `package.json` but can be run via npx:

```bash
npx knip                 # Detect unused files, exports, and dependencies
npx jscpd src/           # Detect copy-paste / duplicate code blocks
```

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`:

```
typecheck → lint → format:check → test → build
```

---

## Engine Deep Dive

The engine lives in `src/engine/` and is entirely decoupled from React. It operates on a Paper.js `PaperScope` attached to an HTML `<canvas>` element.

### Coordinate System

- **Origin**: center of the dial at `(0, 0)`
- **Unit conversion**: `1 mm = 10 Paper.js points` (constant `MM_TO_PX = 10`)
- **Rotation**: stored in `item.data.rotation` in degrees

### `CanvasEngine` — Orchestrator

The main entry point. Responsibilities:

1. **Initialization**: creates `PaperScope`, 4 layers, builds `EngineContext`, instantiates sub-modules
2. **Tool event routing**: `onMouseDown/Drag/Up` dispatches to `DrawingTools` or `SelectionManager` based on `currentTool`
3. **Public API**: thin wrappers that delegate to sub-modules (e.g., `setSelectionPosition()` → `SelectionManager.setPosition()`)
4. **Zoom**: mouse wheel handler with `0.1 – 10×` clamping
5. **Pan**: right-click drag or dedicated pan tool
6. **SVG export**: exports only the `drawLayer` contents, clipped to dial circle
7. **Undo/redo**: `restoreFromJSON()` to restore Paper.js project state from JSON snapshots

### `GridRenderer` — Grid Drawing

- **Polar grid**: concentric circles at configurable mm spacing + radial lines at configurable degree spacing
- **Cartesian grid**: horizontal + vertical lines at configurable mm spacing
- **Major/minor lines**: every 5th line is drawn thicker for visual hierarchy
- **Dial boundary**: white filled circle (the watch dial) with gray border and center cross

### `SnapManager` — Intelligent Snapping

Applies snapping in priority order:

1. **Points** (if enabled): snaps to nearest endpoint/center of existing shapes within 5px view tolerance
2. **Grid** (if enabled): rounds to nearest grid intersection (`snapSpacing × MM_TO_PX`)
3. **Angular** (if enabled): snaps angle from origin to configured degree step (e.g., 6° for minute markers, 30° for hour markers)

### `DrawingTools` — Shape Creation

Each tool follows the same pattern:

- **`showXPreview(point, style)`**: renders a translucent preview on the overlay layer during drag
- **`commitX(point, style)`**: creates the final shape on the draw layer

Shared helpers reduce duplication:

- `applyStroke(path, style)` — sets stroke color & width
- `applyStyle(path, style)` — stroke + optional fill
- `showPreview(item, opacity)` — moves item to overlay with transparency

**Supported tools**: line, polyline (click-to-add-points, auto-close), arc (3-point), circle, ellipse, rectangle, polygon (N-sided regular), dot, text

### `SelectionManager` — Selection & Transforms

Handles everything related to selected items:

- **Selection**: click to select, shift-click to add/toggle, marquee (rubber-band) selection
- **Highlight**: dashed blue rectangle around selected items on overlay layer
- **Transforms**: position (X/Y in mm), size (W/H in mm), rotation (degrees), center H/V
- **Style editing**: stroke color, fill color, stroke width per selection
- **Text editing**: content, horizontal alignment (left/center/right), vertical alignment (top/center/bottom)
- **Clipboard**: copy/paste with smart offset (uses snap spacing when snap is enabled)
- **Duplicate**: clone with +5px offset
- **Delete**: remove selected items
- **Replace mode**: select source item → click target → target gets replaced with source at target's position/size/rotation
- **Radial clone**: duplicate N times rotated evenly around center (0,0)
- **Mirror**: clone with horizontal or vertical flip around center
- **Center point**: toggleable crosshair overlay at selection center

---

## Component Documentation

### `Sketch.tsx` — Canvas Host

The bridge between React and the Paper.js engine:

- Creates a `<canvas>` element and initializes `CanvasEngine` on mount
- Exports `getEngine()` for imperative access from other components
- Uses `useEffect` hooks to sync store state → engine:
  - Tool changes, style changes, diameter, grid settings, snap settings, center point
- Registers keyboard shortcuts:
  - `Cmd+Z` / `Cmd+Shift+Z` — undo/redo
  - `Cmd+C` / `Cmd+V` — copy/paste
  - Single keys: `V` (select), `L` (line), `P` (polyline), `A` (arc), `C` (circle), `E` (ellipse), `R` (rectangle), `G` (polygon), `D` (dot), `T` (text), `H` (pan)

### `Toolbar.tsx` — Left Sidebar

Vertical toolbar with three button groups:

1. **Drawing tools**: 11 tools with icons, tooltips, and keyboard shortcuts
2. **Actions**: undo, redo, duplicate, delete, radial clone, mirror H, mirror V
3. **Export/View**: SVG download, fit-to-view

### `ToolStylePanel.tsx` — Drawing Style

Appears next to the toolbar when a drawing tool is active. Controls:

- **Stroke**: color picker + width (mm)
- **Fill**: color picker + "None" toggle
- **Polygon sides**: shown only when polygon tool is active (3–64)

### `PropertiesPanel.tsx` — Right Sidebar

Thin composition layer that renders 5 sub-panels:

#### `DialPanel`
- Dial diameter input (mm, default 28.5)
- Fit-to-view button

#### `GridPanel`
- Toggle polar/cartesian grid visibility
- Polar settings: circle spacing (mm), angle spacing (degrees)
- Cartesian settings: spacing (mm)
- Snap spacing (mm)

#### `SnapPanel`
- Master snap toggle
- Individual toggles: grid, points, angular
- Angular step input (degrees)

#### `LayersPanel`
- Layer list with active highlight
- Per-layer: visibility toggle, lock toggle, rename (double-click), delete
- Add layer button
- Minimum 1 layer enforced

#### `SelectionPanel`
- Only visible when items are selected
- Position (X/Y in mm), size (W/H in mm), rotation (degrees)
- Center H / Center V buttons
- Stroke color + width, fill color + "None"
- Text properties (content, justification H/V) — shown only for text items
- Center point checkbox
- Replace button (single selection only)

### `StatusBar.tsx` — Bottom Bar

Displays: active tool name, dial diameter, zoom percentage, selection count.

### `HelpTooltip.tsx` — Bottom Hint

Static hint bar: "Right-click drag to pan | Scroll to zoom | Esc to cancel | Del to delete"

---

## Feature Checklist

### Drawing Tools
- [x] Select tool (click, shift-click multi-select, marquee selection)
- [x] Line tool
- [x] Polyline tool (click-to-add, auto-close near start)
- [x] Arc tool (3-point)
- [x] Circle tool
- [x] Ellipse tool
- [x] Rectangle tool
- [x] Polygon tool (configurable 3–64 sides)
- [x] Dot tool
- [x] Text tool (click or drag-to-size)
- [x] Pan tool / right-click drag
- [x] Auto-select after drawing

### Canvas
- [x] Origin at center (0,0)
- [x] Millimeter-accurate coordinate system (1mm = 10px)
- [x] 4-layer architecture (grid, dial, draw, overlay)
- [x] Mouse wheel zoom (0.1× – 10×)
- [x] Fit-to-view
- [x] Live tool previews on overlay layer

### Grid & Snapping
- [x] Polar grid (concentric circles + radial lines)
- [x] Cartesian grid (horizontal + vertical lines)
- [x] Major/minor grid line hierarchy
- [x] Grid snap (configurable spacing)
- [x] Point snap (endpoints + centers, 5px tolerance)
- [x] Angular snap (configurable degree step)
- [x] Independent snap spacing

### Selection & Transforms
- [x] Single & multi-select
- [x] Marquee (rubber-band) selection
- [x] Move by dragging
- [x] Position editing (X/Y in mm)
- [x] Size editing (W/H in mm)
- [x] Rotation editing (degrees)
- [x] Center horizontally / vertically
- [x] Delete selected
- [x] Duplicate (offset +5px)
- [x] Copy / paste (smart offset)
- [x] Replace mode (swap items preserving transform)
- [x] Selection highlight (dashed blue rect)
- [x] Center point marker (toggleable crosshair)

### Dial Features
- [x] Configurable dial diameter (mm)
- [x] Radial clone (N copies around center)
- [x] Mirror horizontal / vertical
- [x] SVG export (draw layer only, clipped to dial)

### Style Editing
- [x] Stroke color (drawing defaults + per-selection)
- [x] Fill color with transparent option
- [x] Stroke width (mm)
- [x] Text content editing
- [x] Text horizontal alignment (left/center/right)
- [x] Text vertical alignment (top/center/bottom)

### Layer Management
- [x] Multiple layers
- [x] Add / remove layers (minimum 1)
- [x] Toggle visibility per layer
- [x] Toggle lock per layer
- [x] Rename layers (double-click)

### Undo / Redo
- [x] JSON snapshot-based undo/redo (50 levels)
- [x] Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)

### Keyboard Shortcuts
- [x] Single-key tool switching (V, L, P, A, C, E, R, G, D, T, H)
- [x] Cmd+Z / Cmd+Shift+Z — undo/redo
- [x] Cmd+C / Cmd+V — copy/paste
- [x] Cmd+D — duplicate
- [x] Delete / Backspace — delete selected
- [x] Escape — cancel current operation

### Developer Experience
- [x] ESLint v9 flat config with TypeScript, React, Prettier integration
- [x] Prettier formatting
- [x] Vitest test suite (11 tests)
- [x] GitHub Actions CI (typecheck → lint → format → test → build)
- [x] Dead code detection (knip)
- [x] Duplicate code detection (jscpd)
