# SEIHouse world systems — Sect adapter

`PocketWorldController` (`../PocketWorldScene.ts`) builds the scene and wires these systems
together. The browser-independent `src/engine/EngineRuntime.ts` now owns fixed
simulation stepping, presentation time, pause/resume and lifecycle; the controller
supplies browser animation frames. Each world system owns one area.

| System | Owns |
|---|---|
| `RenderSystem` | WebGL renderer, quality settings (`RENDER_QUALITY`), canvas resizing |
| `SkySystem` | Starfield and atmosphere, scene lights, sun and moon, fireflies |
| `WorldStyleSystem` | World types (planet styles) and the color fade between them |
| `CameraSystem` | Camera rig, presets, zoom, planet spin/tilt/fling, double-tap focus, opening spin |
| `InputSystem` | Pointer, touch pinch, wheel and keyboard; turns gestures into camera and placement actions |
| `PlacementSystem` | Armed tool, hover cursor, building/removing/sculpting, the locked Sect grounds |
| `SectHallSystem` | The home pagoda's look (`../pagodaStyles.ts`) and rebuilding it in place |
| `DiscipleSystem` | Disciples: spawning, choosing destinations, steering, collisions |
| `CreatureSystem` | Sheep, sailboats, swans and ducks |
| `WeatherSystem` | Rain and snow clouds and what they do to the ground and trees |
| `SkyEventsSystem` | Hot air balloons and shooting stars |
| `DayNightSystem` | Time of day, time modes, day counter, daylight factors |
| `ObjectAnimationSystem` | Placed-object animation: pop-in, windmills, windows, beams, fires, flags |
| `EffectsSystem` | Sparkle bursts |
| `TourSystem` | The scripted 30-second tour |

Shared pieces:

- `context.ts`: `WorldContext`, the planet, its scene groups and the entity registry
  (`WorldEntities`) every system works against, plus the Sect-zone constants.
- `spatial.ts`: surface geometry: standing things on the planet, footprints, doorways,
  free-spot checks.
- `SurfaceNavigation.ts`: shared disciple/sheep footprints, swept surface movement,
  idle/spawn recovery, crowd-safe movement, oriented deck support and cached local routes.
- `initialWorld.ts`: compatibility export for the Sect starter content in
  `src/game/sects/initialWorld.ts`.
- `SceneResources.ts`: owned subtree release and whole-world resource teardown.
- `worldStats.ts`: the counts and happiness shown in the UI.

Mesh builders live in `../objects/` (re-exported from `../MiniatureObjects.ts`).

Saving/loading is not implemented. Its next milestone is a versioned plain-data
world document and tested scene reconstruction. `WorldEntities` is a live registry
with render handles, not the saved-world format. See the
[engine audit](../../../docs/seihouse-engine-audit.md) for the staged plan.

**Phase order matters.** Fixed simulation runs clock/terrain, disciples, creatures,
balloons, weather, shooting stars and effects. Presentation runs tour choreography,
camera, world style, sky, object animation and fireflies once per host frame, then
renders. Tour changes reach simulation on the next fixed step. See
[runtime contracts](../../../docs/engine-runtime.md) before changing this order.

Collision findings, verification and navigation limits: [collision audit](../../../docs/collision-audit.md).
