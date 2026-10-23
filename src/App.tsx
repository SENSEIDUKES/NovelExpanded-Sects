import { useEffect, useRef, useState } from 'react';
import { PocketWorldController } from './three/PocketWorldScene';
import {
  CameraViewId,
  TimeMode,
  ToolId,
  WorldState,
} from './types/world';
import { DockCategory, ToolDock } from './components/ToolDock';
import { ActiveToolHud } from './components/menu/ActiveToolHud';
import { CategoryPopover } from './components/menu/CategoryPopover';
import { WorldInspectorPopover } from './components/menu/WorldInspectorPopover';
import { resolveShortcutAction } from './components/menu/menuConfig';
import { DEFAULT_PAGODA_STYLE, PagodaStyleId } from './three/pagodaStyles';
import { DEFAULT_WORLD_TYPE, WorldTypeId } from './three/worldTypes';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PocketWorldController | null>(null);

  const [worldState, setWorldState] = useState<WorldState>({
    planetName: 'Sect World',
    population: 12,
    happiness: 96,
    dayCount: 1,
    activeTool: null,
    activeView: 'orb',
    worldType: DEFAULT_WORLD_TYPE,
    pagodaStyle: DEFAULT_PAGODA_STYLE,
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

  const [webglLost, setWebglLost] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<DockCategory | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);

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

  // Keyboard accelerators: 1-7 for categories, X/Delete for Erase, Esc to step back or disarm
  useEffect(() => {
    if (worldState.tourActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const inInput =
        isEditingName ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;

      const action = resolveShortcutAction(e.key, {
        openCategory,
        inspectorOpen,
        activeTool: worldState.activeTool,
        isEditingText: inInput,
      });

      switch (action.type) {
        case 'close-inspector':
          e.preventDefault();
          setInspectorOpen(false);
          break;
        case 'close-category':
          e.preventDefault();
          setOpenCategory(null);
          break;
        case 'disarm-tool':
          e.preventDefault();
          controllerRef.current?.setTool(null);
          break;
        case 'toggle-category':
          e.preventDefault();
          setInspectorOpen(false);
          setOpenCategory((prev) =>
            prev === action.category ? null : action.category,
          );
          break;
        case 'toggle-remove':
          e.preventDefault();
          controllerRef.current?.setTool(
            worldState.activeTool === 'remove' ? null : 'remove',
          );
          break;
        case 'none':
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    worldState.tourActive,
    worldState.activeTool,
    openCategory,
    inspectorOpen,
    isEditingName,
  ]);

  const handleToggleCategory = (category: DockCategory) => {
    setInspectorOpen(false);
    setOpenCategory((prev) => (prev === category ? null : category));
  };

  const handleToggleInspector = () => {
    setOpenCategory(null);
    setInspectorOpen((prev) => !prev);
  };

  const handleSelectWorldType = (world: WorldTypeId) => {
    controllerRef.current?.setWorldType(world);
  };

  const handleSelectPagodaStyle = (style: PagodaStyleId) => {
    controllerRef.current?.setPagodaStyle(style);
  };

  const handleSelectTool = (tool: ToolId) => {
    const nextTool = worldState.activeTool === tool ? null : tool;
    controllerRef.current?.setTool(nextTool);
    // On compact viewports, auto-collapse the popover once a brush is armed so the planet is clear
    if (nextTool && window.innerWidth < 768) {
      setOpenCategory(null);
    }
  };

  const handleDisarmTool = () => {
    controllerRef.current?.setTool(null);
  };

  const handleRenamePlanet = (newName: string) => {
    setWorldState((prev) => ({
      ...prev,
      planetName: newName,
    }));
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
    setInspectorOpen(false);
    setOpenCategory(null);
    if (worldState.tourActive) {
      controllerRef.current?.stopTour();
    } else {
      controllerRef.current?.startTour();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#070913]">
      {/* Full-Bleed 3D Three.js Canvas Viewport */}
      <div
        ref={mountRef}
        onPointerDown={() => {
          // Clicking onto the 3D globe dismisses open popovers so the user has an unobstructed view
          if (openCategory || inspectorOpen) {
            setOpenCategory(null);
            setInspectorOpen(false);
          }
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label="Interactive 3D Sect World in Space"
      />

      {/* WebGL Context Lost Fallback */}
      {webglLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070913]/95 text-[#faf6ee]">
          <div className="max-w-md p-6 text-center bg-[#141829] rounded-2xl border border-white/12 shadow-2xl">
            <h2 className="text-xl font-semibold mb-2">
              Sect World Viewport Paused
            </h2>
            <p className="text-sm text-white/70">
              The 3D WebGL context was interrupted. Reload or restore the tab
              to resume inspecting {worldState.planetName}.
            </p>
          </div>
        </div>
      )}

      {/* Top-Center Active Tool HUD Pill & Tour Status Pill */}
      <ActiveToolHud
        activeTool={worldState.activeTool}
        onDisarmTool={handleDisarmTool}
        tourActive={worldState.tourActive}
        tourPhase={worldState.tourPhase}
        onStopTour={() => controllerRef.current?.stopTour()}
      />

      {/* Floating Spatial Creation UI (Hidden during 30s Cinematic Tour) */}
      {!worldState.tourActive && (
        <>
          {/* Contextual Category Popover Grid */}
          <CategoryPopover
            category={openCategory}
            onClose={() => setOpenCategory(null)}
            activeTool={worldState.activeTool}
            onSelectTool={handleSelectTool}
            worldType={worldState.worldType}
            onSelectWorldType={handleSelectWorldType}
            pagodaStyle={worldState.pagodaStyle}
            onSelectPagodaStyle={handleSelectPagodaStyle}
            objectCounts={worldState.objectCounts}
          />

          {/* Non-Blocking World Inspector Popover */}
          <WorldInspectorPopover
            open={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
            worldState={worldState}
            onRenamePlanet={handleRenamePlanet}
            onSelectView={handleSelectView}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onSelectTimeMode={handleSelectTimeMode}
            onToggleTour={handleToggleTour}
            onEditingNameChange={setIsEditingName}
          />

          {/* Desktop Floating Right Pro Dock */}
          <aside
            aria-label="Desktop creation dock"
            className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-30 pointer-events-auto"
          >
            <ToolDock
              orientation="vertical"
              activeTool={worldState.activeTool}
              onSelectTool={handleSelectTool}
              openCategory={openCategory}
              onToggleCategory={handleToggleCategory}
              inspectorOpen={inspectorOpen}
              onToggleInspector={handleToggleInspector}
            />
          </aside>

          {/* Mobile Floating Bottom Pill Dock */}
          <div
            aria-label="Mobile creation dock"
            className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[calc(100vw-1.5rem)]"
          >
            <ToolDock
              orientation="horizontal"
              activeTool={worldState.activeTool}
              onSelectTool={handleSelectTool}
              openCategory={openCategory}
              onToggleCategory={handleToggleCategory}
              inspectorOpen={inspectorOpen}
              onToggleInspector={handleToggleInspector}
            />
          </div>
        </>
      )}
    </div>
  );
}
