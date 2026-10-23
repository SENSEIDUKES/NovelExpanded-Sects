/** Sect-specific starter settings; these are content choices rather than runtime rules. */
export const SECT_WORLD_DEFINITION = {
  id: 'novel-expanded-sects',
  title: 'Sect World',
  homeDirection: [-0.16, 0.22, 0.96] as const,
  protectedGrounds: { angularRadius: 0.17, blendAngularRadius: 0.3 },
  pasture: {
    direction: [-0.20, -0.15, 0.97] as const,
    radius: 0.098,
    enabled: false,
  },
} as const;
