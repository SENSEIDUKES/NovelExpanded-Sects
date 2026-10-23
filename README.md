# SEIHouse World Engine

A focused engine for living miniature worlds. NovelExpanded Sects is the first
reference game built with it: spherical terrain, inhabitants, placement, navigation,
weather, day/night lighting, close inspection and mobile interaction.

This repository currently contains both the engine foundation and the Sect app.
The engine foundation is version **0.1.0**; a reusable distribution and persistent
world format are upcoming milestones.

## Run and verify

Use Node.js 22+ and Bun 1.3.11. `bun.lock` is the authoritative dependency lock.

```sh
bun install --frozen-lockfile
bun run dev
bun run verify
```

Verification checks TypeScript, the behavior/runtime/resource suites and a
production build. GitHub Actions runs the same frozen install and verification.

## Where the engine lives

| Area | Responsibility |
| --- | --- |
| `src/engine` | DOM-independent runtime: fixed updates, frame callbacks, clocks, lifecycle and diagnostics |
| `src/three` | Three.js world/browser adapter, spherical terrain, camera, input, rendering and world systems |
| `src/game/sects` | Sect starter definition and layout |
| `src/App.tsx`, `src/components` | React app and authoring controls |

The live app now runs through `EngineRuntime`. `PocketWorldController` remains the
compatible browser facade and exposes `pause()`, `resume()`,
`getEngineDiagnostics()` and `dispose()`. Existing placement, styles, tours and
camera methods remain available.

The surrounding systems still contain Sect rules and UI coupling. Further
extraction follows working features, with save/load and a content catalog as the
next boundaries to establish.

- [Engine audit and staged plan](docs/seihouse-engine-audit.md)
- [Runtime API and integration](docs/engine-runtime.md)
- [Dependency provenance](docs/dependency-provenance.md)
- [World system map](src/three/engine/README.md)
- [Sect product requirements](SECTS_PRODUCT_SPEC.md)
- [Collision audit](docs/collision-audit.md)

## Ownership and dependencies

SEIHouse-specific engine and game code can be developed as a proprietary product
on top of third-party libraries. Three.js, React and other dependencies retain
their own licenses. The repository's public visibility is unchanged, and
`private: true` in package metadata prevents npm publishing rather than making
source private. This change does not introduce a project source-code license or
change collaborator access. Record code/asset provenance and the chosen license
terms before distributing an engine package.
