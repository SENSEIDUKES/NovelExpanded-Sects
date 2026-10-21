// Barrel for the miniature-world object builders. Import from here; the code lives in
// src/three/objects/, one module per category:
//   types.ts       - PlacedObjectType and the entity interfaces (placed objects, villagers,
//                    sheep, clouds, sailboats, ducks, balloons, shooting stars)
//   sectGrounds.ts - Sect home base: stone terrace and pagoda
//   structures.ts  - houses, windmill, lighthouse, well, fence, stepping path, dock/bridge,
//                    campfire, watchtower, beehive, lantern post
//   nature.ts      - oak, pine, palm, flower cluster
//   creatures.ts   - disciples (villagers), sheep, sailboat, swan/duck flock
//   sky.ts         - hot air balloon, rainbow arch, shooting star, puffy cloud
export * from './objects/types';
export * from './objects/sectGrounds';
export * from './objects/structures';
export * from './objects/nature';
export * from './objects/creatures';
export * from './objects/sky';
