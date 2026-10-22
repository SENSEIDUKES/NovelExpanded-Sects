# Collision and movement audit

Scope: disciples and sheep moving among buildings, trees, lanterns, fence rails,
rainbow feet, other inhabitants, water, cliffs, bridges and docks.

## Findings and fixes

| Finding | Player-visible effect | Change |
| --- | --- | --- |
| Local steering repeatedly chose a different side of nearby obstacles; the watchdog measured movement rather than progress along a route. | Residents could shuffle or circle at scenery indefinitely. | Cached, bounded local A* routes choose explicit detours. Each segment is checked again against current scenery and terrain. |
| Crowd separation ran after solid-object correction, including on the final solver pass. | Residents could be pushed back into a building or fence. | Crowd corrections must follow a clear segment; static recovery has the final say. |
| Pausing, grazing and watching shooting stars bypassed collision checks. | Placing an object or changing the ground under an idle inhabitant could leave it embedded. | Resolve and update mesh positions before idle branches as well as movement. |
| Exact overlaps were skipped or used a fixed world-axis escape vector. | Overlapping inhabitants could remain stacked; escape could fail at a planet pole. | Deterministic tangent-plane separation and exact spherical clearance handle coincident centers at any latitude. |
| Free-range sheep enforced the pasture boundary without checking whether the pasture was enabled. | An invisible circular wall remained in Sect worlds, which have no pasture. | Apply both inside and outside corral constraints only when enabled. |
| Sheep did not avoid disciples, while disciples avoided sheep. | Sheep could walk into or remain inside a stationary resident. | Both use combined body radii, crowd checks and the same walking solver. |
| Target checks used smaller rainbow-foot and pasture margins than hard collision. Building door targets bypassed free-space checks. | A destination could be inside an area the resident could never occupy. | Match foot/pasture margins and validate building entrances before selecting them. |
| Movement checked the resulting position rather than the intermediate path. | Larger steps could skip thin obstacles or water edges. | Subdivide movement into steps of at most 0.004 in unit-direction space and validate each step. |
| Any point within a circle around a bridge counted as supported, irrespective of yaw. | Residents could stand on water beside the boards. | Use the oriented rectangular deck/ramp footprint and its standing height, including while paused. |

## Implementation boundaries

- Footprints remain lightweight circles, fence capsules, and separate rainbow feet.
  This is surface walking, not mesh-level rigid-body physics; roof overhangs are not
  obstacles and paths/flowers remain walkable.
- Searches explore at most 700 grid nodes, within a local tangent patch of about
  0.4 direction units. Distant destinations can use partial routes. Impossible or
  disconnected destinations are retried with a cooldown and eventually replaced
  by the disciple watchdog; this is not a global navigation mesh for arbitrary mazes.
- New placement or sculpting can require moving an embedded inhabitant to nearby
  safe ground. Recovery projects overlaps, tries the previous safe position, then
  searches rings out to about 0.24 direction units. It cannot invent safe land if
  an entire region has been flooded or packed with obstacles.
- Boats and ducks retain their existing water-target wandering and pier/boat
  avoidance. Their routing and mesh-level collisions were inspected but are not
  replaced by this land-navigation change.

## Verification

`npm run verify` runs type checking, all existing suites, the new deterministic
collision suite, and a production build. Collision cases cover detours past the
pagoda, rotated fence and rainbow; two-way traffic through lanterns; coincident
paused residents at a pole; live placement; bounded route retries; water crossing;
rotated bridge support; underwater spawning; rainbow target clearance; grazing
sheep; disabled and enabled pastures; and sheep-to-disciple separation.

The existing full-world test now checks every resident against every footprint and
unsafe terrain for a simulated minute, with full pagoda clearance (the old test
allowed 0.005 penetration), and verifies that each resident leaves its starting
position.
