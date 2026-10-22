import React, { useRef, useState } from 'react';
import {
  Compass,
  Moon,
  Pencil,
  Play,
  SlidersHorizontal,
  Sun,
  Sunset,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CameraViewId, TimeMode, WorldState } from '../../types/world';

interface WorldInspectorPopoverProps {
  open: boolean;
  onClose: () => void;
  worldState: WorldState;
  onRenamePlanet: (newName: string) => void;
  onSelectView: (view: CameraViewId) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSelectTimeMode: (mode: TimeMode) => void;
  onToggleTour: () => void;
  onEditingNameChange?: (editing: boolean) => void;
}

const CAMERA_PRESETS: { id: CameraViewId; label: string }[] = [
  { id: 'orb', label: 'Globe' },
  { id: 'surface', label: 'Surface' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'village', label: 'Pagoda' },
];

const LIGHTING_MODES: { id: TimeMode; label: string; icon: React.ReactNode }[] = [
  { id: 'auto', label: 'Cycle', icon: <Compass className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'day', label: 'Day', icon: <Sun className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'twilight', label: 'Twilight', icon: <Sunset className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'night', label: 'Night', icon: <Moon className="w-3.5 h-3.5 shrink-0" /> },
];

/**
 * Non-blocking Apple Pro World Inspector popover.
 * Lets creators adjust camera views, zoom, lighting & sky cycle, and planet name
 * while watching the 3D planet react in real time without a dark modal scrim.
 */
export function WorldInspectorPopover({
  open,
  onClose,
  worldState,
  onRenamePlanet,
  onSelectView,
  onZoomIn,
  onZoomOut,
  onSelectTimeMode,
  onToggleTour,
  onEditingNameChange,
}: WorldInspectorPopoverProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const startEditing = () => {
    setIsEditingName(true);
    onEditingNameChange?.(true);
  };

  const finishEditing = () => {
    if (!worldState.planetName.trim()) {
      onRenamePlanet('Sect World');
    }
    setIsEditingName(false);
    onEditingNameChange?.(false);
  };

  return (
    <section
      role="dialog"
      aria-label="World Inspector"
      className="fixed z-30 pointer-events-auto bottom-21 left-3 right-3 md:left-auto md:bottom-auto md:right-21 md:top-1/2 md:-translate-y-1/2 md:w-[340px] max-h-[72vh] md:max-h-[82vh] flex flex-col rounded-3xl bg-[#0e1322]/84 backdrop-blur-2xl border border-white/14 text-[#f8fafc] shadow-2xl overflow-hidden transition-all duration-150"
    >
      {/* Inspector Header */}
      <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center text-white/90 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-white">
            World Inspector
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close World Inspector"
          title="Close Inspector (Esc)"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Inspector Body */}
      <div className="p-4 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        {/* 1. Planet Name & Unboxed Tabular Telemetry */}
        <div className="flex flex-col gap-2 pb-3.5 border-b border-white/10">
          <div className="flex items-center justify-between gap-2">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={worldState.planetName}
                maxLength={28}
                onChange={(e) => onRenamePlanet(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    nameInputRef.current?.blur();
                  }
                }}
                aria-label="Planet Name"
                className="w-full px-2.5 py-1 text-base font-semibold bg-white/10 border border-emerald-400/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="group flex items-center gap-2 text-left cursor-pointer focus:outline-none"
                title="Click to rename planet"
              >
                <h3 className="text-base font-semibold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  {worldState.planetName}
                </h3>
                <Pencil className="w-3.5 h-3.5 text-white/45 group-hover:text-emerald-300 transition-colors shrink-0" />
              </button>
            )}
          </div>

          {/* Primary Telemetry Row (Unboxed text + · separators) */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-white/65 font-mono-tabular">
            <span>
              Disciples <strong className="font-semibold text-white">{worldState.population}</strong>
            </span>
            <span aria-hidden="true" className="text-white/30">
              ·
            </span>
            <span>
              Harmony <strong className="font-semibold text-emerald-300">{worldState.happiness}%</strong>
            </span>
            <span aria-hidden="true" className="text-white/30">
              ·
            </span>
            <span>
              Day <strong className="font-semibold text-white">{worldState.dayCount}</strong>
            </span>
          </div>

          {/* Secondary Object Breakdown (Unboxed text + · separators) */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-white/50 font-mono-tabular">
            <span>{worldState.objectCounts.trees} Trees</span>
            <span aria-hidden="true">·</span>
            <span>{worldState.objectCounts.flowers} Flowers</span>
            <span aria-hidden="true">·</span>
            <span>{worldState.objectCounts.clouds} Clouds</span>
          </div>
        </div>

        {/* 2. Camera View Segmented Control & Zoom */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/75">Camera Angle</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onZoomOut}
                aria-label="Zoom Out"
                title="Zoom Out (-)"
                className="min-w-[38px] min-h-[34px] px-2 flex items-center justify-center rounded-xl bg-white/6 hover:bg-white/14 active:scale-95 border border-white/8 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onZoomIn}
                aria-label="Zoom In"
                title="Zoom In (+)"
                className="min-w-[38px] min-h-[34px] px-2 flex items-center justify-center rounded-xl bg-white/6 hover:bg-white/14 active:scale-95 border border-white/8 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            role="group"
            aria-label="Camera presets"
            className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/35 border border-white/8"
          >
            {CAMERA_PRESETS.map((preset) => {
              const active = worldState.activeView === preset.id && !worldState.tourActive;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectView(preset.id)}
                  aria-pressed={active}
                  className={`py-2 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white/18 text-white shadow-xs border border-white/15'
                      : 'text-white/60 hover:text-white hover:bg-white/6 border border-transparent'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Lighting & Sky Segmented Control */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-white/75">Lighting & Sky</span>
          <div
            role="group"
            aria-label="Lighting modes"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/35 border border-white/8"
          >
            {LIGHTING_MODES.map((mode) => {
              const active = worldState.timeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onSelectTimeMode(mode.id)}
                  aria-pressed={active}
                  className={`py-2 px-3 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-sky-400/20 text-sky-200 border border-sky-300/35 shadow-xs'
                      : 'text-white/65 hover:text-white hover:bg-white/6 border border-transparent'
                  }`}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Cinematic 30s Tour Action */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onToggleTour}
            className="w-full min-h-[42px] px-4 py-2.5 rounded-2xl bg-white text-[#0b0f1c] hover:bg-white/90 active:scale-[0.99] text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start 30s Cinematic Tour</span>
          </button>
        </div>
      </div>
    </section>
  );
}
