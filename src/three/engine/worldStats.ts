import type { WorldState } from '../../types/world';
import type { WorldEntities } from './context';

/** Counts and happiness shown in the UI, computed from what's on the planet */
export function computeWorldStats(
  entities: WorldEntities,
): Pick<WorldState, 'population' | 'happiness' | 'objectCounts'> {
  const { placedObjects } = entities;
  const houses = placedObjects.filter((o) => o.type === 'house').length;
  const trees = placedObjects.filter(
    (o) => o.type === 'oak' || o.type === 'pine' || o.type === 'palm',
  ).length;
  const windmills = placedObjects.filter((o) => o.type === 'windmill').length;
  const lighthouses = placedObjects.filter(
    (o) => o.type === 'lighthouse' || o.type === 'watchtower',
  ).length;
  const flowers = placedObjects.filter(
    (o) => o.type === 'flower' || o.type === 'beehive',
  ).length;
  const rainbows = placedObjects.filter((o) => o.type === 'rainbow').length;
  const campfires = placedObjects.filter((o) => o.type === 'campfire').length;
  const villagers = entities.villagers.length;
  const sheep = entities.sheep.length;
  const clouds = entities.clouds.length;
  const boats = entities.sailboats.length + entities.ducks.length;

  const happiness = Math.min(
    100,
    Math.round(
      78 +
        houses * 2 +
        trees * 0.6 +
        flowers * 1.2 +
        windmills * 3 +
        lighthouses * 2 +
        rainbows * 4 +
        campfires * 2 +
        boats * 1.5,
    ),
  );

  return {
    population: villagers,
    happiness,
    objectCounts: {
      houses,
      trees,
      windmills,
      lighthouses,
      villagers,
      sheep,
      clouds,
      flowers,
      boats,
    },
  };
}
