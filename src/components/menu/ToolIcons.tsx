import React from 'react';
import {
  Anchor,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bird,
  Bug,
  Castle,
  Cloud,
  CloudSnow,
  CloudSun,
  Earth,
  Eraser,
  Fan,
  Flame,
  Flower2,
  Home,
  Lamp,
  LampFloor,
  Landmark,
  Leaf,
  Mountain,
  MountainSnow,
  PawPrint,
  Rainbow,
  Sailboat,
  Sparkles,
  TowerControl,
  Trees,
  Users,
  Waves,
  Wind,
} from 'lucide-react';
import { ToolId } from '../../types/world';
import { WorldTypeDefinition } from '../../three/worldTypes';
import { DockCategory } from './menuConfig';

export function renderToolIcon(id: ToolId, className = 'w-4 h-4 shrink-0'): React.ReactNode {
  switch (id) {
    case 'tree':
      return <Trees className={className} />;
    case 'house':
      return <Home className={className} />;
    case 'windmill':
      return <Fan className={className} />;
    case 'lighthouse':
      return <TowerControl className={className} />;
    case 'watchtower':
      return <Castle className={className} />;
    case 'campfire':
      return <Flame className={className} />;
    case 'lantern':
      return <LampFloor className={className} />;
    case 'balloon':
      return <Wind className={className} />;
    case 'sailboat':
      return <Sailboat className={className} />;
    case 'dock':
      return <Anchor className={className} />;
    case 'duck':
      return <Bird className={className} />;
    case 'mountain':
      return <Mountain className={className} />;
    case 'lake':
      return <Waves className={className} />;
    case 'flower':
      return <Flower2 className={className} />;
    case 'beehive':
      return <Bug className={className} />;
    case 'cloud':
      return <Cloud className={className} />;
    case 'snowcloud':
      return <CloudSnow className={className} />;
    case 'rainbow':
      return <Rainbow className={className} />;
    case 'shootingstar':
      return <Sparkles className={className} />;
    case 'villager':
      return <Users className={className} />;
    case 'sheep':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M8 15a4 4 0 0 1-2-7.5 4.5 4.5 0 0 1 8.5-1A3.5 3.5 0 0 1 18 10a3.5 3.5 0 0 1-1 6.8H8Z" />
          <path d="M9 17v3" />
          <path d="M15 17v3" />
        </svg>
      );
    case 'raise':
      return <ArrowUpFromLine className={className} />;
    case 'lower':
      return <ArrowDownToLine className={className} />;
    case 'remove':
      return <Eraser className={className} />;
  }
}

export function renderCategoryIcon(
  id: DockCategory,
  className = 'w-4 h-4 shrink-0',
): React.ReactNode {
  switch (id) {
    case 'world':
      return <Earth className={className} />;
    case 'terrain':
      return <MountainSnow className={className} />;
    case 'structures':
      return <Landmark className={className} />;
    case 'nature':
      return <Leaf className={className} />;
    case 'decorations':
      return <Lamp className={className} />;
    case 'creatures':
      return <PawPrint className={className} />;
    case 'sky':
      return <CloudSun className={className} />;
  }
}

/** Dual-tone planetary sphere swatch for World biome cards */
export function WorldSwatch({
  world,
  sizeClass = 'w-6 h-6',
}: {
  world: WorldTypeDefinition;
  sizeClass?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} rounded-full border border-white/25 shadow-inner shrink-0 block`}
      style={{
        background: `linear-gradient(160deg, ${world.swatch.land} 0%, ${world.swatch.land} 54%, ${world.swatch.water} 54%, ${world.swatch.water} 100%)`,
      }}
    />
  );
}
