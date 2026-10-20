# NovelExpanded Sects

## Purpose

Sects are simple communities built around shared reading interests and genres. Readers who enjoy mystery, romance, cultivation, horror, or other types of stories can join a Sect with people who enjoy similar work.

Each Sect collectively builds and customizes a living miniature world that represents its community.

## Sect World

The current pocket-world prototype is the foundation.

The Sect version should:

- Remove the terrarium, room, windowsill, stand, plant, and other background scenery.
- Place the world against a clean starry space background.
- Make the world modestly larger than the current prototype, targeting approximately a 20% increase.
- Preserve the miniature-world feeling.
- Keep the world alive with moving inhabitants, creatures, weather, sunlight, moonlight, and environmental animation.
- Allow closer zooming for inspecting buildings, inhabitants, creatures, and small details.
- Support smooth desktop zoom and mobile pinch-to-zoom.
- Save the world so every Sect member sees the same layout and changes.

## Access

### Tour

Tour is for people who are not members of the Sect.

It uses the existing 30-second cinematic tour concept to present the Sect world. The tour should be preserved and later adapted to showcase the Sect's actual world.

### Visit

Visit is for Sect members.

Members can freely rotate, zoom, and explore their shared world, but they cannot alter it unless they have building permission.

### Build

Build is for the Sect leader and people the leader appoints.

Authorized builders can place, move, and remove unlocked components and customize the world.

## Collective QI and Components

Sect members pool their QI to unlock components they want for the shared world.

The basic loop is:

1. Members contribute QI toward a component.
2. The Sect unlocks that component.
3. The component becomes available to the Sect.
4. The leader or an appointed builder places it.
5. The updated world is visible to the whole Sect.

The system should distinguish between:

- Locked components.
- Unlocked components that are available to place.
- Components currently placed in the world.

## Primitive Catalog

NovelExpanded will provide individual primitives rather than complete prebuilt themes. Users create the Sect's appearance by combining the components they choose to unlock.

Gothic, romantic, celestial, horror, Eastern fantasy, and similar aesthetics should be tags or filters across the catalog, not restrictive theme packages.

The current parent-category direction is:

- **World:** The base world itself.
- **Terrain:** Mountains, lakes, rivers, cliffs, and other land changes.
- **Buildings:** Sect halls, castles, libraries, temples, towers, bridges, and houses.
- **Nature:** Trees, flowers, crystals, vines, and other natural elements.
- **Decorations:** Statues, banners, lanterns, paths, fountains, and monuments.
- **Creatures:** People, animals, Familiars, dragons, guardians, and other living beings.
- **Sky:** Weather, clouds, suns, moons, floating islands, flying creatures, and celestial elements.

These category names and boundaries can be refined as the catalog develops. The goal is a small number of simple parent categories with substantial variety inside each one.

## Features to Preserve From the Prototype

Preserve and refine the existing foundation where useful:

- Rotatable spherical world.
- Curved-surface object placement.
- Terrain sculpting.
- Placeable and removable objects.
- Moving inhabitants and creatures.
- Dynamic weather.
- Sun, moon, lighting, and day/night behavior.
- Water and environmental animation.
- Camera movement and the 30-second tour.
- Placement effects and world animation.
- Mobile interaction.

The current cozy-village objects are examples of primitives, not the required visual identity of Sects.

## Persistence

The current prototype rebuilds its hardcoded world when reloaded. The Sect version must save the world as persistent data.

The saved world must be separate from the rendered 3D scene. It should retain the selected world, terrain changes, unlocked components, placed components, placement details, environmental choices, and authorized builders.

The 3D scene should reconstruct itself from that saved Sect-world data.

## Possible Future Sect Battles

Sect Battles are a possible future feature, not a current requirement. Their rules, rewards, penalties, and competitive format have not been decided.

The world may eventually support three visual conditions:

- **Regular:** The Sect's normal customized world.
- **Victory:** A temporary heavenly state with purple celestial glow and celebratory effects inspired by Eastern fantasy.
- **Defeated:** A temporary lightning-tribulation state with dark clouds, lightning, smoke, fire, and damage effects.

Victory and Defeated must be temporary visual layers. They must not delete components, permanently damage the world, or alter the Sect's saved layout. When the condition ends, the world returns to its normal state.

## Current Scope Boundaries

The current work does not require:

- Producing complete aesthetic themes.
- Building Sect Battles.
- Deciding exact battle rewards or QI penalties.
- Creating the full primitive catalog.
- Replacing the prototype's living-world foundation.

The immediate objective is to turn the existing pocket-world prototype into a persistent, star-backed Sect world that supports Tour, Visit, Build, collective component ownership, and user-directed customization.
