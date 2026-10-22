# Sect World — Apple Pro Creation Menu & Spatial HUD Redesign

Elevate the world-building menu from a flat prototype toolbar into an Apple-grade spatial creation studio inspired by visionOS, Final Cut Pro, and Shapr3D, allowing creators to sculpt, inspect, and light their Sect world through floating translucent glass surfaces without obstructing the 3D space viewport.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices incorporate your confirmed design preferences. Please review and click **Proceed** to begin implementation.

- **Confirmed Material & Layout Style**: **Floating Translucent Glass Dock & Popovers** — The full-height opaque beige sidebar and edge-to-edge mobile bottom strip are replaced with floating dark-frosted spatial glass surfaces (`backdrop-blur-2xl`, subtle specular `1px` borders, and soft depth shadows) that hover over the full-bleed 3D canvas.
- **Confirmed Category Tool Display**: **Floating Popover Grid with Icons & Labels** — Selecting a category opens an anchored floating popover card beside the dock (or above the dock on mobile) displaying a 2-column grid of tool cards with crisp icons, clear titles, brief descriptions, and keyboard shortcuts instead of swapping the dock icons behind a back button.
- **Confirmed Pro Workflow Upgrades**:
  1. **Active Tool HUD Banner**: A sleek floating HUD pill at the top-center of the viewport displaying the currently armed tool's icon, name, placement hint, keyboard shortcut badge, and a one-tap **Done / Disarm (`Esc`)** button.
  2. **Non-Blocking World Inspector Popover**: Replaces the screen-blocking center modal with an anchored floating inspector panel for real-time Camera Presets, Zoom Controls, Lighting & Sky segmented switches, Planet Naming, live Sect telemetry, and the 30s Cinematic Tour trigger.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the Sect World interface into a tactile, non-blocking spatial creation studio. The 3D WebGL canvas now occupies 100% of the viewport (`100vw × 100vh`), while floating glassmorphic UI layers provide instant access to world palettes, terrain sculpting brushes, nature/decorations/creatures/sky tools, and live scene inspection.
- **Target Audience / Persona**: World builders and Sect creators on both desktop and mobile touch devices who want precision creative controls with effortless visual hierarchy and zero modal friction.
- **Key Value**: Eliminates "mystery-meat" icon navigation and view-blocking modals. Users can see every tool's name and function at a glance, switch categories with a single click or number key (`1`–`7`), monitor their active brush in a dedicated HUD, and preview lighting or camera transitions live against an unobstructed planet.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Full-Bleed Spatial Canvas & Floating Dock**:
   - On desktop, a floating vertical glass dock sits anchored `16px` (`right-4`) from the right edge, vertically centered.
   - On mobile, a floating horizontal glass pill dock sits `16px` (`bottom-4`) above the bottom safe area, keeping aggregate sticky height well below 15% of the viewport.
   - Each category button features a `44×44px` minimum touch target, subtle hover/active luminance, an active category indicator dot when a tool inside that category is armed, and a tooltip/caption.
2. **Contextual Category Popover Grid**:
   - Clicking any category in the dock opens a floating glass popover anchored directly beside the dock on desktop (`right-20`) or cleanly above the dock on mobile (`bottom-20`).
   - Inside the popover, a header shows the category title, item count, and keyboard shortcut hint, followed by a responsive 2-column grid of labeled tool cards (or rich dual-tone planet swatches with biome descriptions for the **World** category).
   - Empty categories (such as *Structures* while cozy-farm structures are filtered out) display a refined "Sect Architecture Coming Soon" state or disabled indicator without dead clicks.
3. **Active Tool HUD & Keyboard Accelerator Workflow**:
   - Whenever a creation tool or the **Erase / Remove** brush is armed, a floating glass HUD pill appears at the top-center of the screen (`top-4`).
   - It shows the tool's icon, title, a concise 1-line action description (e.g., *"Click planet surface to raise a snowy faceted peak"*), and a **Done (`Esc`)** button so users never wonder why clicking the globe places an object versus orbiting.
   - Pressing `1`–`7` opens the corresponding category, `Backspace`/`Delete` or `X` toggles the Remove brush, and `Esc` closes the open popover/inspector first or disarms the active tool.
4. **Non-Blocking Pro World Inspector**:
   - Clicking the Inspector trigger button at the top of the dock opens the floating **World Inspector** popover without dimming or blocking the 3D planet.
   - Includes inline planet renaming, clean unboxed tabular telemetry (`Pop · Happy · Day` and object counts using `·` separators), Apple-style segmented controls for **Camera View** (`Globe`, `Surface`, `Orbit`, `Pagoda`) paired with `Zoom In / Out` buttons, a 4-way segmented **Atmosphere & Time** selector (`Cycle`, `Day`, `Twilight`, `Night`), and a prominent **30s Cinematic Tour** action button.
   - During the 30s Cinematic Tour, a minimal floating glass pill at the bottom-center shows the current tour phase and a **Stop Tour** control.

### Visual Identity & Theme
- **Aesthetic Direction**: Apple Pro App / visionOS Spatial Glass — dark translucent obsidian-slate glass panels (`bg-[#0f1322]/78 backdrop-blur-2xl`) that harmonize with the deep-space 3D canvas (`#070913`), paired with crisp high-contrast alabaster typography and subtle specular borders (`border-white/14`).
- **Color Palette & Mood**:
  - **60% Dominant Canvas**: Full-bleed deep space WebGL viewport (`#070913`) with subtle radial vignette free of opaque sidebars.
  - **30% Structural Glass Surfaces**: Frosted obsidian glass (`rgba(15, 19, 34, 0.78)`), elevated card surfaces (`rgba(255, 255, 255, 0.06)`), hover states (`rgba(255, 255, 255, 0.11)`), and hairline specular dividers (`rgba(255, 255, 255, 0.10)`).
  - **10% Accent Budget**: Crisp celestial jade & warm gold accents (`#7dd3a8` / `#34d399` for active creation states, `#38bdf8` for lighting/sky selection, and `#f87171` for the destructive Erase tool).
- **Typography & Hierarchy**:
  - **Display & UI Controls**: `Plus Jakarta Sans` / system Apple geometric sans with optical compensation (`tracking-tight` on headings, `font-medium` on single-line controls).
  - **Telemetry & Shortcuts**: Tabular numerals (`font-mono tabular-nums`) for population, happiness percentage, day counters, object counts, and keyboard shortcut hints.
  - **Zero-Pill Metadata**: All world statistics and object breakdowns render as clean, unboxed inline text separated by `·` dividers.
- **Interactive Feedback & Motion**:
  - Compositor-only transitions (`transform`, `opacity`) settling within `150ms–180ms` using `cubic-bezier(0.16, 1, 0.3, 1)`.
  - Tactile button press scaling (`active:scale-95`) and clear `focus-visible` accessibility rings.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Viewport 3D Canvas with Floating Spatial Overlays**
  - *Chosen Approach*: Remove the layout-splitting flex sidebar so the Three.js container spans the entire viewport, layering the Dock, Popover Drawer, Inspector, and Active Tool HUD as floating `pointer-events-auto` glass panels inside a `pointer-events-none` overlay layer.
  - *Why*: Eliminates the harsh vertical seam between the space skybox and a flat beige bar, prevents canvas resize jitter, and makes the planet feel truly suspended in space.
  - *Alternatives Considered*: Keeping a fixed-width docked sidebar, which reduces horizontal viewport space and feels like a legacy form panel.
- **Decision 2: Contextual Popover Grid vs. In-Place Toolbar Swap**
  - *Chosen Approach*: Keep the primary category dock persistent at all times and render category tools in a floating popover card with icons, titles, and descriptions.
  - *Why*: Users maintain spatial memory of where categories live, can switch directly from *Terrain* to *Sky* in one click without hitting a "Back" button first, and can read tool names and descriptions before selecting.
  - *Alternatives Considered*: Swapping the dock icons in place, which hides top-level navigation and forces extra clicks.
- **Decision 3: Non-Blocking Inspector Popover vs. Full-Screen Dimmed Modal**
  - *Chosen Approach*: Anchor the World Inspector as a floating glass card beside the dock (and a compact translucent sheet on mobile) with no dark backdrop scrim obstructing the planet.
  - *Why*: Adjusting lighting (`Day`, `Twilight`, `Night`) or camera angles (`Globe`, `Surface`, `Orbit`, `Pagoda`) is a visual operation—users need to see the planet respond immediately in full clarity.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         App (100vw × 100vh Root)                          │
├─────────────────────────────────────┬─────────────────────────────────────┤
│   Full-Bleed 3D Viewport Layer      │   Spatial Glass HUD Overlay Layer   │
│   (PocketWorldController / WebGL)   │   (z-20..40, pointer-events-none)   │
└─────────────────┬───────────────────┴─────────────────┬───────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────┐ ┌───────────────────────────────────┐
│  Three.js Engine Systems            │ │ 1. ActiveToolHud (Top-Center)     │
│  • CameraSystem (Presets & Zoom)    │ │    • Armed tool icon + label      │
│  • PlacementSystem (Active Tool)    │ │    • Placement hint & Esc disarm  │
│  • WorldStyleSystem (5 Biomes)      │ ├───────────────────────────────────┤
│  • DayNightSystem (TimeMode)        │ │ 2. ProToolDock (Right / Bottom)   │
│  • TourSystem (30s Cinematic Tour)  │ │    • Inspector toggle button      │
└─────────────────────────────────────┘ │    • 7 Category triggers (1–7)    │
                                        │    • Pinned Erase / Remove tool   │
                                        ├───────────────────────────────────┤
                                        │ 3. CategoryPopover (Floating)     │
                                        │    • 2-col labeled tool cards     │
                                        │    • Biome swatch cards (World)   │
                                        ├───────────────────────────────────┤
                                        │ 4. WorldInspectorPopover          │
                                        │    • Inline Planet Name editor    │
                                        │    • Unboxed Sect telemetry (·)   │
                                        │    • Segmented Camera + Zoom      │
                                        │    • Segmented Lighting & Sky     │
                                        │    • 30s Cinematic Tour trigger   │
                                        └───────────────────────────────────┘
```

### Data Model & State
- **`WorldState` Synchronization**: Retains full compatibility with `PocketWorldController` state updates (`planetName`, `population`, `happiness`, `dayCount`, `activeTool`, `activeView`, `worldType`, `timeMode`, `tourActive`, `tourPhase`, `objectCounts`).
- **UI Popover Coordination State**:
  - `openCategory: DockCategory | null` controls the floating Category Popover.
  - `inspectorOpen: boolean` controls the non-blocking World Inspector Popover.
  - Opening the World Inspector automatically closes any open Category Popover (and vice versa) so floating panels never collide or overlap on screen.
- **Pure UI Helper Exports for Automated Testing**:
  - Export pure helper functions and structured metadata from the dock/menu modules (such as category tool resolution, keyboard shortcut mapping, and active tool metadata lookup) so unit tests can deterministically verify the new Pro menu logic alongside existing engine tests.

### Interactive Component & State Mapping
- **Category & Tool Selection Flow**:
  - Clicking a category in `ToolDock` toggles `openCategory` and closes `inspectorOpen`.
  - Clicking a tool card in `CategoryPopover` arms/disarms the tool via `controller.setTool()`, keeps or closes the popover cleanly on mobile for immediate placement, and updates `ActiveToolHud`.
  - Clicking a biome card in the `World` popover invokes `controller.setWorldType(id)` with immediate active ring feedback.
- **Keyboard Shortcut Handler**:
  - `1`–`7` keys toggle the 7 creation categories when not typing in the planet name input.
  - `Escape` dismisses open popovers first (`inspectorOpen` or `openCategory`), and if no popover is open, disarms `activeTool` (`controller.setTool(null)`).
- **Tour Mode Presentation**:
  - Starting the 30s Tour (`controller.startTour()`) hides the creation dock and popovers, presenting a floating glass **Tour Progress Pill** at the bottom-center with the live `tourPhase` label and an immediate **Exit Tour** button.
