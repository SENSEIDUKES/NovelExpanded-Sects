# Phase 1: Scene & Camera Transformation (Sect World in Space)

Transform the indoor windowsill terrarium prototype into an open-space Sect World suspended in a deep starry cosmos, scaled up by 20% (`1.2x`) with a subtle atmospheric rim glow and smooth close-up inspection via desktop scroll wheel and mobile two-finger pinch-to-zoom.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core design and interaction choices have been confirmed for Phase 1 based on your preferences:

- **Confirmed Decision 1 — Planet Outer Boundary**: Strip out the windowsill, linen cloth, succulent pot, walnut stand, brass collar, and reflective glass orb shell, replacing the glass orb with an open-space planet surrounded by a subtle Fresnel atmospheric rim glow.
- **Confirmed Decision 2 — Starry Space Backdrop**: Replace the indoor lavender room sky with a deep cosmos environment featuring multi-layered twinkling stars, a 3D starfield particle halo, and subtle nebula gradients that harmonize with Day, Twilight, and Night lighting.
- **Confirmed Decision 3 — Close-Up Zoom & Surface Tilt**: Support continuous desktop wheel zoom and mobile two-finger pinch-to-zoom using a unified spherical camera model that smoothly tilts toward the local surface horizon as the user zooms into close inspection range.

---

## 1. Overview & Core Concept

- **What It Does**: Liberates the living miniature world from its indoor terrarium container and suspends it in a deep, starry cosmos at 120% of its original scale, enabling Sect members and visitors to zoom in closely to inspect individual buildings, villagers, creatures, and terrain details on both desktop and mobile devices.
- **Target Audience / Persona**: NovelExpanded Sect members, leaders, and visitors exploring a community's shared living miniature world across mobile phones and desktop browsers.
- **Key Value**: Establishes the core Sect World visual identity—preserving the tactile miniature charm and living animations while shifting the setting to a mystical cosmic backdrop with effortless close-up inspection.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Cosmic Arrival & 360° Intro Spin**: The world loads suspended in deep starry space at `1.2x` scale, framed by a delicate atmospheric rim halo. It performs its signature smooth 360° intro spin before settling into the default planetary overview.
  2. **Desktop Wheel Zoom & Close-Up Tilt**: Scrolling the mouse wheel or trackpad smoothly adjusts camera distance. At far-to-mid distances, the camera looks toward the planet center; as the camera approaches close-up inspection range, the look-at target smoothly interpolates toward the front surface tangent so buildings, villagers, and trees are viewed from an intimate miniature angle rather than top-down.
  3. **Mobile Pinch-to-Zoom & One-Finger Spin**: On touch screens, dragging with a single finger rotates the globe with rotational inertia, while a two-finger pinch gesture smoothly zooms in and out without triggering accidental object placements or erratic spins.
  4. **Camera Presets & 30-Second Tour**: Camera view presets (`Globe`, `Surface`, `Orbit`, `Village`) and the 30-second choreographed Tour seamlessly synchronize with the zoom and tilt state so users can zoom freely from any preset.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Celestial miniature diorama—tactile, low-poly storybook craftsmanship floating in a serene deep-space cosmos.
  - *Color Palette & Mood*:
    - `--background`: Deep cosmic obsidian (`#070913` to `#0d1226`) with subtle indigo/amethyst and teal nebula wisps.
    - `--surface`: Warm parchment and dark slate HUD surfaces with high-contrast legibility and zero viewport occlusion.
    - `--primary` / `--accent`: Celestial gold (`#ffe484`), atmospheric sky-blue rim glow (`#6bc5ff` in daylight shifting to `#7a8cff` in twilight and `#4e66b8` at night).
  - *Typography & Hierarchy*: Clean geometric UI controls paired with `tabular-nums` for population, happiness, day counter, and object metrics.
  - *Component Styling & Layout*: Mobile-first ergonomic thumb-zone dock (`min-h-[44px] min-w-[44px]` touch hitboxes) and compact right-hand desktop toolbar keeping the central 3D space viewport unobstructed.

- **Interactive Feedback & Motion**:
  - Frame-rate independent exponential damping (`1 - Math.exp(-dt * k)`) on all zoom, tilt, preset, and spin transitions.
  - Surface placement cursor ring remains suppressed during two-finger pinch gestures and globe drag spins to prevent visual clutter.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Scaling via Root Group (`1.2x`) vs. Mutating Local Entity Radii**
  - *Chosen Approach*: Apply the 20% scale increase (`scale = 1.2`) at the `planetRoot` level (and calibrate camera distances, shadow frustums, and atmospheric rim radius accordingly).
  - *Why*: Preserves 100% of the intricate spherical collision math, villager pathfinding clearances, sheep pasture boundaries, and surface normal offsets without introducing floating-point regressions across 20+ entity types.
  - *Alternatives Considered*: Multiplying `baseRadius` and every hardcoded clearance constant across all object generators, which risks subtle clipping or pathfinding bugs.

- **Decision 2: Unified Zoom-Driven Camera State vs. Raw Position Vector Lerping**
  - *Chosen Approach*: Represent camera framing with a continuous `targetZoomDistance` and `currentZoomDistance` paired with distance-dependent surface tilt interpolation.
  - *Why*: Allows scroll wheel and pinch-to-zoom to work naturally from any camera preset and smoothly transition between full-globe view and close-up surface inspection without getting stuck or clipping through mountains.
  - *Alternatives Considered*: Simply moving `camTargetPos` along a fixed ray, which either clips into the planet surface or looks straight down at roofs instead of providing a scenic close-up angle.

- **Decision 3: Multi-Pointer Touch State Machine for Mobile Pinch-to-Zoom**
  - *Chosen Approach*: Track active touch pointers in a `Map<number, THREE.Vector2>`. When 2 pointers are active, switch immediately into pinch-zoom mode (computing inter-finger distance delta) and lock out single-finger spin and tap-to-place until all fingers are lifted.
  - *Why*: Eliminates accidental object placement when lifting fingers after a pinch gesture and provides silky-smooth mobile inspection.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        React Viewport & HUD Shell                       │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐  │
│  │   3D Canvas Mount Container   │   │  Responsive Control Dock/Sheet│  │
│  │  (Wheel + Multi-Touch Events) │   │ (Tools, Presets, Time, Tour)  │  │
│  └───────────────┬───────────────┘   └───────────────┬───────────────┘  │
└──────────────────┼───────────────────────────────────┼──────────────────┘
                   │                                   │
                   ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PocketWorldController                           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Cosmic Space Environment (Replaces RoomEnvironment)            │  │
│  │    ├─ Deep Cosmos Shader Dome (Twinkling Stars + Nebula Tints)    │  │
│  │    ├─ 3D Parallax Starfield Points (Surrounding Space Dust/Stars) │  │
│  │    └─ Atmospheric Fresnel Rim Halo (Hugs 1.2x Scaled Planet)      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 2. Scaled Planet Root (planetRoot.scale = 1.2)                    │  │
│  │    ├─ PlanetTerrain (Faceted Land, Mountains, Turquoise Seas)     │  │
│  │    ├─ Placed Objects & Inhabitants (Villagers, Sheep, Boats)      │  │
│  │    └─ Celestial Orbitals (Sun, Cratered Moon, Fireflies, Clouds)  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 3. Camera & Multi-Input Zoom/Tilt Rig                             │  │
│  │    ├─ Desktop Wheel Handler -> Updates targetZoomDistance         │  │
│  │    ├─ Mobile 2-Finger Pinch Tracker -> Updates targetZoomDistance │  │
│  │    └─ Close-Range Surface Tilt Blend (Center Look -> Horizon Look)│  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Planet Scale Constant**: `PLANET_SCALE = 1.2` applied to `planetRoot`, expanding the effective base radius from `0.75` to `0.90` world units (and total atmosphere envelope to `~1.55` units).
  - **Camera Zoom Bounds**:
    - `MIN_ZOOM_DIST = 1.18` (intimate close-up just above rooftops and villagers, safely outside the `~1.08` max mountain peak radius).
    - `MAX_ZOOM_DIST = 6.20` (wide cosmic overview showing the planet, orbiting sun/moon, and surrounding starfield).
  - **Active Pointers Map**: Tracks `pointerId -> { x, y }`, `isPinching: boolean`, `lastPinchDist: number`, and `pinchCooldownUntil: number` to cleanly separate 1-finger globe spin/tap from 2-finger pinch-to-zoom.

- **Interactive Component & State Mapping**:
  - **Desktop Wheel (`wheel` event)**: Normalizes `deltaY` across mouse wheels and trackpads, scaling zoom step proportionally to current distance so close-up zooming feels fine-grained and wide zooming feels brisk.
  - **Mobile Pinch (`pointerdown` / `pointermove` / `pointerup` / `pointercancel`)**:
    - `1 pointer`: Rotates `planetRoot` on drag (`> 5px`) or places/sculpts on tap release if no pinch occurred during the gesture.
    - `2 pointers`: Cancels pending tap/drag, hides placement cursor ring, measures pinch spread ratio, and smoothly updates camera zoom distance.
  - **Close-Range Surface Tilt**: As zoom distance moves below `2.2` toward `1.18`, the camera position and look-at target smoothly blend from radial center-gazing toward a slightly elevated, horizon-skimming miniature angle so close-up inspection showcases 3D building facades and walking inhabitants in profile.
  - **Camera Presets & UI**: Rename the `"Orb"` camera preset label to `"Globe"` in the UI to reflect the new open-space Sect World identity while keeping all preset buttons, lighting modes (`Cycle`, `Day`, `Twilight`, `Night`), and the 30-second Tour working seamlessly at the new `1.2x` scale.
