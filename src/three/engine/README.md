# Sect world engine

`PocketWorldController` (`../PocketWorldScene.ts`) builds the scene, wires these systems
together and runs the frame loop. Each system owns one area, so it can be improved on its own.

| System | Owns |
|---|---|
| `RenderSystem` | WebGL renderer, quality settings (`RENDER_QUALITY`), canvas resizing |
| `SkySystem` | Starfield and atmosphere, scene lights, sun and moon, fireflies |
| `WorldStyleSystem` | World types (planet styles) and the color fade between them |
| `CameraSystem` | Camera rig, presets, zoom, planet spin/tilt/fling, double-tap focus, opening spin |
| `InputSystem` | Pointer, touch pinch, wheel and keyboard; turns gestures into camera and placement actions |
| `PlacementSystem` | Armed tool, hover cursor, building/removing/sculpting, the locked Sect grounds |
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
- `initialWorld.ts`: what a new Sect world starts with.
- `worldStats.ts`: the counts and happiness shown in the UI.

Mesh builders live in `../objects/` (re-exported from `../MiniatureObjects.ts`).

Saving/loading and win/lose conditions don't exist yet. When they arrive they become their own
systems here, reading and writing `WorldEntities`.

**Frame order matters.** The loop in `PocketWorldController.animate` runs the systems in a fixed
order: tour/clock, camera, world style, sky, objects, disciples, creatures, balloons, weather,
shooting stars, fireflies, effects, render. Keep it unless a change means to alter behavior.

Collision findings, verification and navigation limits: [collision audit](../../../docs/collision-audit.md).
