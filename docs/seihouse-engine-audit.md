# SEIHouse World Engine: foundation audit

SEIHouse can become a practical, ownable world engine by developing the technology
already running NovelExpanded Sects. The useful first product is a compact browser
engine for living miniature worlds: terrain, placeable content, inhabitants,
weather, lighting, interaction, and tools that make those systems reliable to build
on. Its value comes from that working combination and a dependable way to extend it.

The audit found substantial working systems, with the application still responsible
for several jobs an engine should own. This foundation change introduces a real
runtime, begins separating Sect content from engine infrastructure, and improves
resource cleanup. Persistent world data is the next major foundation milestone.

Audit baseline: `origin/main` commit `4c5cc97`, including the merged collision fixes
and pagoda styles. “Implemented” below describes this foundation change against
that baseline; it does not describe a released standalone SDK.

## Current capability

| Area | Status after this change | What that means |
| --- | --- | --- |
| Spherical terrain and placement | Working reference implementation | Worlds can be explored, sculpted and populated on a curved surface. |
| Inhabitants and navigation | Working, with bounded local routing | Disciples and sheep handle scenery and crowd clearance; route search and recovery have documented limits. |
| Weather, sky, lighting and animation | Working reference implementation | A small world already feels alive. |
| Core runtime | Implemented foundation | A browser-independent scheduler owns fixed simulation time, presentation time, pause/resume, ordered callbacks and teardown. |
| Runtime inspection | Implemented foundation | Detached counters expose steps, frames, dropped simulation time and registered systems. The browser controller adds renderer resource counts. |
| Content boundary | Started | Sect starter settings and population move under `src/game/sects`; existing callers retain a compatibility import. |
| Resource ownership | Improved | Shared cleanup covers removed object trees and entire scene teardown. Resources still need an asset manager before deliberate sharing across owners/worlds. |
| Automated verification | Working foundation | Headless behavior, collision, runtime and resource tests complement type checking and the production build. |
| Save/load and world reconstruction | Not implemented | Reloading still builds the Sect starter world. A rendered scene is not a durable world document. |
| Reproducible worlds and replay | Not implemented | Fixed time steps alone do not control the remaining global randomness, IDs or input sequence. |
| Build permissions and shared editing | Not implemented | Current tools are a local prototype, not an authoritative shared-world permission system. |
| Standalone engine package | Not implemented | NovelExpanded Sects remains the engine's reference application. |

## What this foundation improves

**Runtime ownership.** `EngineRuntime` has no DOM or Three.js dependency. The host
supplies elapsed time; systems receive fixed simulation steps and one presentation
callback per host frame. Registration order is explicit. Frame clamping and a
substep limit keep a stalled frame from causing unbounded catch-up work. Dropped
time is visible in diagnostics.

The browser controller now uses this runtime for the actual world. Simulation
runs before presentation, followed by rendering. Inhabitants, creatures, weather,
shooting stars and effects retain their relative simulation order. Camera, lighting
and placed-object presentation run once per host frame. The scripted tour now
uses active engine time, so pausing or hiding a tab does not skip forward through
its sequence. This is an intentional timing boundary; tour changes are presented
after that host frame's fixed simulation work.

**Lifecycle.** The controller exposes pause, resume and diagnostics. Hidden tabs
freeze the engine clocks, and returning to the tab resets the browser timestamp
rather than simulating the time spent away. Disposal is idempotent. Systems are
released in reverse registration order, all system disposals are attempted, and
scene resources are released before the renderer even if cleanup fails.

**Content separation.** Sect starter layout and home-ground settings have an
explicit home under `src/game/sects`. The existing `PocketWorldController` API
continues to work for the app. This is the first boundary, not a claim that all
Sect rules have been extracted: disciples, the home pagoda, protected-ground
rules and UI reporting remain coupled to existing systems.

**Resource cleanup.** Removing a placed object, replacing the pagoda, finishing a
shooting star and cleaning up tour objects now use shared resource handling.
Whole-scene teardown covers owned geometry, materials, textures and light-shadow
resources. Per-object removal preserves textures because a sprite can be shared
with another live object; explicit cross-world asset ownership is a future step.

## Where the boundaries should end up

| Layer | Owns | Boundary to maintain |
| --- | --- | --- |
| SEIHouse engine core | Lifecycle, clocks, scheduling, diagnostics, world-document contracts, command contracts | No React updater functions, DOM, WebGL objects or Sect rules. |
| Three.js/browser adapter | Rendering, scene projection, GPU ownership, input and camera integration | Consumes world data and engine events; rendering objects are runtime views, not saved records. |
| World systems | Curved terrain, spatial queries, navigation, environment and generic inhabitant behavior | Use explicit services and world data; game-specific destination rules belong in content/game code. |
| Sect game and content | Protected hall grounds, pagoda styles, starter layout, placement recipes, disciple gathering, QI and builder rules | Uses engine contracts without making the generic runtime depend on Sect concepts. |
| App and editing tools | Menus, world inspector, selection feedback and presentation of engine snapshots | Sends validated commands and reads public snapshots/events. |

This remains one repository while the boundaries settle. A separate package is
useful after a stable public API and a second host can use it. Moving every file
at once would add churn without proving reusability.

## Remaining findings to address before expanding the catalog

1. **World data and rendered entities are mixed.** Current entity types include
   meshes, limb groups, material references, lights and transient animation state.
   Saving those entities would tie every saved world to a particular render tree.
   The product specification already requires persistent data separate from the
   scene. A versioned plain-data world document is the highest-value next step.

2. **Game recipes and generic placement share one large dispatcher.** A house
   creates a path and two disciples; a beehive scatters flowers; weather, terrain
   edits and object construction share the same tool handler. Keep those recipes,
   but register them as Sect behavior so the engine's placement operation has a
   clear, testable contract.

3. **Content definitions are repeated.** The object type union, mesh factory,
   collision radii, placement choices and tool metadata live in different files.
   Adding content can therefore omit a collider or interaction policy. A typed
   primitive catalog should join these definitions and reject unknown entries.
   The existing typed pagoda-style definitions provide a useful example.

4. **World systems still depend on the UI and Three.js.** `WorldContext` carries a
   React-style state updater and scene groups. The new core is browser-independent;
   the surrounding world simulation is not yet renderer-independent. Extract
   commands, snapshots and service interfaces incrementally as save/load is added.

5. **Randomness and IDs are not world-owned.** Many systems call `Math.random` and
   `Date.now`. Tests currently control globals to reproduce collision tie breaks.
   Add world-owned seeded random services and stable ID allocation. Keep simulation
   randomness separate from cosmetic randomness so adding an effect does not
   change where inhabitants walk.

6. **Performance has no established scene budget.** Terrain surface queries scan
   facets; navigation and crowd checks scan inhabitants and footprints. Bounded
   lookahead improved an important hot path, but no maximum population or mobile
   scene capacity has been established. Measure representative scenes before
   claiming scale or choosing a spatial index.

## Milestones and acceptance gates

These are dependency gates, not calendar promises. Each milestone should keep the
existing Sect world working and leave a small reviewable change.

| Milestone | Concrete deliverable | Acceptance gate |
| --- | --- | --- |
| 0. Runtime foundation — this change | Actual runtime integration, lifecycle, diagnostics, initial content boundary and owned-resource cleanup | Runtime and scene-resource tests pass; existing suites and production build pass; browser checks cover paused clocks, resumed motion and repeated teardown. |
| 1. Durable world model | Versioned plain-data schema for world settings, terrain changes, placed primitives and persistent inhabitants; seeded services and stable IDs; save/load reconstruction | Save an edited world, recreate its scene from the document and retain IDs, terrain and layout. Validate malformed documents and unknown versions without partially replacing the current world. A fixed seed plus the same commands reproduces the supported simulation state under controlled tests. |
| 2. Catalog and commands | Typed primitive definitions; validated place/remove/change commands; Sect recipes and build capabilities | Add a sample primitive through its definition without editing unrelated engine switches. Rejected commands leave the world unchanged. Visit/Build/Tour capabilities have tests. Shared persistence enforces authorization at its authoritative boundary. |
| 3. Spatial and rendering budget | Profiled reference scenes; measured terrain/navigation queries; quality profiles and asset ownership rules | Establish supported scene sizes and target devices. Record frame time, simulation cost, draw calls, resource counts and memory behavior across editing sessions. Use measurements to select terrain lookup acceleration, spatial indexing or asset reuse. |
| 4. Engine release boundary | Stable versioned API, clean host adapter, migration policy and reference application | A second small host uses the core without importing Sect UI/rules. Compatibility, failure recovery, teardown, dependency provenance and package/build checks pass. Publish or distribute only as an explicit release decision. |

The recommended next build is milestone 1. A world that survives reconstruction
provides a much stronger platform for future components than a larger hardcoded
starter scene.

## What “proprietary” means here

SEIHouse can own its original engine implementation, world systems, tooling,
content definitions and assets while using Three.js as its rendering dependency.
Third-party libraries retain their own ownership and license obligations. A
project name or an npm `private` flag does not transfer those rights.

The GitHub repository was public at audit time. Public visibility and the intended
commercial licensing model are separate decisions. The package's `private: true`
prevents accidental npm publication; it does not make the repository confidential.
This audit does not change repository visibility, add a legal license, or assert
ownership of imported material. Before distributing an engine package, record the
origin and applicable license of dependencies and assets and decide the intended
licensing model for SEIHouse-authored code.

## Technical evidence appendix

The baseline references below can be inspected with
`git show 4c5cc97:<path>`. Current implementation links refer to this working change.

| Finding | Baseline evidence at `4c5cc97` | Current status / implementation |
| --- | --- | --- |
| Controller owned timing and scheduling | `src/three/PocketWorldScene.ts:39–60,238–294` | [EngineRuntime](../src/engine/EngineRuntime.ts) owns clocks/scheduling; [controller](../src/three/PocketWorldScene.ts) supplies the browser driver. |
| Tour had an independent wall clock | `src/three/engine/TourSystem.ts:68,144` | [TourSystem](../src/three/engine/TourSystem.ts) accepts an active-time source; the controller injects runtime time. |
| Teardown covered only input and renderer | `src/three/PocketWorldScene.ts:296–302` | [SceneResources](../src/three/engine/SceneResources.ts) and runtime teardown release owned scene resources. |
| Removed meshes lacked shared cleanup | `src/three/engine/PlacementSystem.ts:440–475`; `SectHallSystem.ts:60–68` had a local helper | Placement, pagoda replacement, tour cleanup and shooting-star expiry use shared resource release. |
| Starter scene was hardcoded in engine composition | `src/three/PocketWorldScene.ts:86–95,165`; `src/three/engine/initialWorld.ts` | [Sect definition](../src/game/sects/worldDefinition.ts), [starter population](../src/game/sects/initialWorld.ts), and compatibility wrapper. |
| Persistent data was required but absent | `SECTS_PRODUCT_SPEC.md:98–104`; `src/three/objects/types.ts:23–66` | Open: a versioned document and reconstruction API are milestone 1. |
| UI and render coupling | `src/three/engine/context.ts:2,30,74–86` | Open outside the new pure runtime. |
| Placement mixed factories and game recipes | `src/three/engine/PlacementSystem.ts:112–233,261–419` | Open: primitive catalog and commands are milestone 2. |
| Spatial queries and tests | `src/three/PlanetTerrain.ts:445–488`; `src/three/engine/SurfaceNavigation.ts`; `tests/engineSystems.test.ts:28–62` | Existing headless coverage is retained; the runtime adds independent timing/lifecycle tests. Capacity remains unmeasured. |

Verification entry point: `npm run verify`. Relevant new suites are
[engine runtime tests](../tests/engineRuntime.test.ts) and
[scene resource tests](../tests/sceneResources.test.ts). Existing
[collision findings](collision-audit.md) describe navigation scope and limits.
