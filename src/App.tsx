import React, { useEffect, useRef, useState } from 'react';
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
import { PocketWorldController } from './three/PocketWorldScene';
import {
  CameraViewId,
  TimeMode,
  ToolId,
  WorldState,
} from './types/world';
import { DockCategory, ToolDock } from './components/ToolDock';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PocketWorldController | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [worldState, setWorldState] = useState<WorldState>({
    planetName: 'Sect World',
    population: 12,
    happiness: 96,
    dayCount: 1,
    activeTool: null,
    activeView: 'orb',
    timeMode: 'auto',
    timeOfDay: 0.24,
    tourActive: false,
    tourElapsed: 0,
    tourPhase: '',
    objectCounts: {
      houses: 4,
      trees: 22,
      windmills: 1,
      lighthouses: 2,
      villagers: 12,
      sheep: 8,
      clouds: 3,
      flowers: 5,
      boats: 3,
    },
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Toolbar category currently opened (null = showing the category icons)
  const [openCategory, setOpenCategory] = useState<DockCategory | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = new PocketWorldController(container, setWorldState);
    controllerRef.current = controller;

    const canvas = container.querySelector('canvas');
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
    };

    if (canvas) {
      canvas.addEventListener('webglcontextlost', onContextLost);
      canvas.addEventListener('webglcontextrestored', onContextRestored);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
      }
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen && !openCategory) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close the filters sheet first; otherwise step back out of the open category
        if (filtersOpen) {
          setFiltersOpen(false);
        } else {
          setOpenCategory(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen, openCategory]);

  // Tapping the armed tool again disarms it
  const handleSelectTool = (tool: ToolId) => {
    controllerRef.current?.setTool(worldState.activeTool === tool ? null : tool);
  };

  const handleSelectView = (view: CameraViewId) => {
    controllerRef.current?.stopTour();
    controllerRef.current?.applyCameraPreset(view);
  };

  const handleZoomIn = () => {
    controllerRef.current?.zoomByFactor(0.84);
  };

  const handleZoomOut = () => {
    controllerRef.current?.zoomByFactor(1.18);
  };

  const handleSelectTimeMode = (mode: TimeMode) => {
    controllerRef.current?.setTimeMode(mode);
  };

  const handleToggleTour = () => {
    setFiltersOpen(false);
    if (worldState.tourActive) {
      controllerRef.current?.stopTour();
    } else {
      controllerRef.current?.startTour();
    }
  };



  return (
    <div className="flex w-screen h-screen overflow-hidden select-none bg-[#070913]">
      {/* Left Column: 3D Three.js Canvas Viewport */}
      <div className="relative flex-1 min-w-0 h-full">
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          aria-label="Interactive 3D Sect World in Space"
        />

        {/* WebGL Context Lost Fallback */}
        {webglLost && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070913]/95 text-[#faf6ee]">
            <div className="max-w-md p-6 text-center bg-[#141829] rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-2">
                Sect World Viewport Paused
              </h2>
              <p className="text-sm text-[#d6cee2]">
                The 3D WebGL context was interrupted. Reload or restore the tab
                to resume inspecting {worldState.planetName}.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Desktop Thin Icon-Only Side Panel (Hidden on mobile and during 30s Tour) */}
      {!worldState.tourActive && (
        <aside
          aria-label="Sect world controls and tool dock"
          className="hidden md:flex w-16 shrink-0 h-full bg-[#faf5ec] border-l border-[#e2d7c5] text-[#382f27] flex-col items-center py-3 gap-2.5 z-20"
        >
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            title="Filters"
            aria-label="Open Filters"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-[#382f27] text-[#fcf8f0] border border-[#261f19] hover:bg-[#4d4136] active:scale-95 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
          </button>

          <div className="w-8 h-px bg-[#e2d7c5] shrink-0" aria-hidden="true" />

          <ToolDock
            orientation="vertical"
            activeTool={worldState.activeTool}
            onSelectTool={handleSelectTool}
            openCategory={openCategory}
            onOpenCategory={setOpenCategory}
          />
        </aside>
      )}

      {/* Desktop Modal for Filters (Planet Info, Grow & 30s Tour, Camera View, Lighting & Sky) */}
      {!worldState.tourActive && filtersOpen && (
        <div className="hidden md:flex fixed inset-0 z-40 items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="relative z-10 w-full max-w-sm max-h-[85vh] bg-[#faf5ec] text-[#382f27] rounded-2xl border border-[#e2d7c5] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#e6dccb] shrink-0">
              <h2 className="text-sm font-semibold text-[#2b221b]">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close Filters"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#594d40] hover:bg-[#eae1d3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-5 overflow-y-auto">
              {/* 1. Planet Identity & Live Stats */}
              <section className="flex flex-col gap-1.5 pb-3 border-b border-[#e6dccb]">
                <div className="flex items-center justify-between gap-2">
                  {isEditingName ? (
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={worldState.planetName}
                      maxLength={28}
                      onChange={(e) =>
                        setWorldState((prev) => ({
                          ...prev,
                          planetName: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        if (!worldState.planetName.trim()) {
                          setWorldState((prev) => ({
                            ...prev,
                            planetName: 'Sect World',
                          }));
                        }
                        setIsEditingName(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          nameInputRef.current?.blur();
                        }
                      }}
                      aria-label="Planet Name"
                      className="w-full px-2 py-0.5 text-lg font-semibold bg-[#fffdf9] border border-[#cbbba3] rounded text-[#2b221b] focus:outline-none focus:ring-2 focus:ring-[#a6cfa0]"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="group flex items-center gap-1.5 text-left cursor-pointer focus:outline-none"
                      title="Click to rename planet"
                    >
                      <h3 className="text-lg font-semibold tracking-tight text-[#2b221b] group-hover:text-[#4e6e3a] transition-colors">
                        {worldState.planetName}
                      </h3>
                      <Pencil className="w-3.5 h-3.5 text-[#8c7d6b] opacity-70 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-[#594d40] font-mono-tabular">
                  <span>
                    Pop{' '}
                    <strong className="font-semibold text-[#2b221b]">
                      {worldState.population}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Happy{' '}
                    <strong className="font-semibold text-[#2e5926]">
                      {worldState.happiness}%
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Day{' '}
                    <strong className="font-semibold text-[#2b221b]">
                      {worldState.dayCount}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[#695b4c] font-mono-tabular pt-0.5">
                  <span>{worldState.objectCounts.houses} Homes</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.trees} Trees</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.boats} Boats</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.sheep} Sheep</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.clouds} Clouds</span>
                </div>
              </section>

              {/* 2. Primary Actions: 30s Tour */}
              <section className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={handleToggleTour}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border bg-[#382f27] text-[#fcf8f0] border-[#261f19] hover:bg-[#4d4136] transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>30s Tour</span>
                </button>
              </section>

              {/* 3. Camera Views & Zoom */}
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#7a6b5a]">
                    Camera View
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      aria-label="Zoom Out"
                      title="Zoom Out (-)"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#f3ede2] text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b] transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      aria-label="Zoom In"
                      title="Zoom In (+)"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#f3ede2] text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b] transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'orb', label: 'Globe' },
                      { id: 'surface', label: 'Surface' },
                      { id: 'orbit', label: 'Orbit' },
                      { id: 'village', label: 'Pagoda' },
                    ] as { id: CameraViewId; label: string }[]
                  ).map((v) => {
                    const active =
                      worldState.activeView === v.id && !worldState.tourActive;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectView(v.id)}
                        className={`px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#e3eedc] text-[#23451e] border-[#a6cfa0] shadow-xs'
                            : 'bg-[#f3ede2] border-transparent text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b]'
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 4. Lighting & Time of Day */}
              <section className="flex flex-col gap-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#7a6b5a]">
                  Lighting & Sky
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      {
                        id: 'auto',
                        label: 'Cycle',
                        icon: <Compass className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'day',
                        label: 'Day',
                        icon: <Sun className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'twilight',
                        label: 'Twilight',
                        icon: <Sunset className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'night',
                        label: 'Night',
                        icon: <Moon className="w-3.5 h-3.5" />,
                      },
                    ] as { id: TimeMode; label: string; icon: React.ReactNode }[]
                  ).map((m) => {
                    const active = worldState.timeMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectTimeMode(m.id)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#e1ecf7] text-[#264669] border-[#a4c2e3] shadow-xs'
                            : 'bg-[#f3ede2] border-transparent text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b]'
                        }`}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Bar: Filters Button + Scrollable Row of Square Icon-Only Tool Buttons */}
      {!worldState.tourActive && (
        <div
          aria-label="Mobile tool dock"
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#faf5ec] border-t border-[#e2d7c5] px-3 py-2.5 flex items-center gap-2.5"
        >
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="h-11 px-3.5 shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#382f27] text-[#fcf8f0] border border-[#261f19] text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
            aria-label="Open Filters"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>Filters</span>
          </button>

          <ToolDock
            orientation="horizontal"
            activeTool={worldState.activeTool}
            onSelectTool={handleSelectTool}
            openCategory={openCategory}
            onOpenCategory={setOpenCategory}
          />
        </div>
      )}

      {/* Mobile Bottom Sheet for Filters (Camera View, Lighting & Sky, World Info & Actions) */}
      {!worldState.tourActive && filtersOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="relative z-10 w-full max-h-[80vh] bg-[#faf5ec] text-[#382f27] rounded-t-3xl border-t border-[#e2d7c5] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="w-10 h-1.5 bg-[#d6c8b4] rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#e6dccb] shrink-0">
              <h2 className="text-sm font-semibold text-[#2b221b]">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close Filters"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#594d40] hover:bg-[#eae1d3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-5 overflow-y-auto">
              {/* Planet Identity & Stats */}
              <section className="flex flex-col gap-1.5 pb-3 border-b border-[#e6dccb]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-semibold text-[#2b221b]">
                    {worldState.planetName}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#594d40] font-mono-tabular">
                    <span>
                      Pop <strong className="font-semibold text-[#2b221b]">{worldState.population}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Happy <strong className="font-semibold text-[#2e5926]">{worldState.happiness}%</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Day <strong className="font-semibold text-[#2b221b]">{worldState.dayCount}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[#695b4c] font-mono-tabular">
                  <span>{worldState.objectCounts.houses} Homes</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.trees} Trees</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.boats} Boats</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.sheep} Sheep</span>
                  <span aria-hidden="true">·</span>
                  <span>{worldState.objectCounts.clouds} Clouds</span>
                </div>
              </section>

              {/* Primary Actions: 30s Tour */}
              <section className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={handleToggleTour}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border bg-[#382f27] text-[#fcf8f0] border-[#261f19] hover:bg-[#4d4136] transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>30s Tour</span>
                </button>
              </section>

              {/* Camera View & Zoom */}
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#7a6b5a]">
                    Camera View
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      aria-label="Zoom Out"
                      className="min-w-[44px] min-h-[36px] px-2.5 flex items-center justify-center rounded-lg bg-[#f3ede2] text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b] transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      aria-label="Zoom In"
                      className="min-w-[44px] min-h-[36px] px-2.5 flex items-center justify-center rounded-lg bg-[#f3ede2] text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b] transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'orb', label: 'Globe' },
                      { id: 'surface', label: 'Surface' },
                      { id: 'orbit', label: 'Orbit' },
                      { id: 'village', label: 'Pagoda' },
                    ] as { id: CameraViewId; label: string }[]
                  ).map((v) => {
                    const active =
                      worldState.activeView === v.id && !worldState.tourActive;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectView(v.id)}
                        className={`px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#e3eedc] text-[#23451e] border-[#a6cfa0] shadow-xs'
                            : 'bg-[#f3ede2] border-transparent text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b]'
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Lighting & Sky */}
              <section className="flex flex-col gap-1.5 pb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#7a6b5a]">
                  Lighting & Sky
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      {
                        id: 'auto',
                        label: 'Cycle',
                        icon: <Compass className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'day',
                        label: 'Day',
                        icon: <Sun className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'twilight',
                        label: 'Twilight',
                        icon: <Sunset className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'night',
                        label: 'Night',
                        icon: <Moon className="w-3.5 h-3.5" />,
                      },
                    ] as { id: TimeMode; label: string; icon: React.ReactNode }[]
                  ).map((m) => {
                    const active = worldState.timeMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectTimeMode(m.id)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#e1ecf7] text-[#264669] border-[#a4c2e3] shadow-xs'
                            : 'bg-[#f3ede2] border-transparent text-[#594d40] hover:bg-[#eae1d3] hover:text-[#2b221b]'
                        }`}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
