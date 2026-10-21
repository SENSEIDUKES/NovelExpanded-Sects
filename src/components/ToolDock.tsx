import { useEffect, useRef } from 'react';
import {
  Anchor,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bird,
  Bug,
  Castle,
  ChevronLeft,
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
import {
  FARM_PROTOTYPE_TOOLS,
  TOOL_CATEGORIES,
  TOOL_DEFINITIONS,
  ToolCategory,
  ToolDefinition,
  ToolId,
} from '../types/world';

export type DockCategory = (typeof TOOL_CATEGORIES)[number]['id'];

function renderToolIcon(id: ToolId) {
  const cls = 'w-4 h-4 shrink-0';
  switch (id) {
    case 'tree':
      return <Trees className={cls} />;
    case 'house':
      return <Home className={cls} />;
    case 'windmill':
      return <Fan className={cls} />;
    case 'lighthouse':
      return <TowerControl className={cls} />;
    case 'watchtower':
      return <Castle className={cls} />;
    case 'campfire':
      return <Flame className={cls} />;
    case 'lantern':
      return <LampFloor className={cls} />;
    case 'balloon':
      return <Wind className={cls} />;
    case 'sailboat':
      return <Sailboat className={cls} />;
    case 'dock':
      return <Anchor className={cls} />;
    case 'duck':
      return <Bird className={cls} />;
    case 'mountain':
      return <Mountain className={cls} />;
    case 'lake':
      return <Waves className={cls} />;
    case 'flower':
      return <Flower2 className={cls} />;
    case 'beehive':
      return <Bug className={cls} />;
    case 'cloud':
      return <Cloud className={cls} />;
    case 'snowcloud':
      return <CloudSnow className={cls} />;
    case 'rainbow':
      return <Rainbow className={cls} />;
    case 'shootingstar':
      return <Sparkles className={cls} />;
    case 'villager':
      return <Users className={cls} />;
    case 'sheep':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cls}
          aria-hidden="true"
        >
          <path d="M8 15a4 4 0 0 1-2-7.5 4.5 4.5 0 0 1 8.5-1A3.5 3.5 0 0 1 18 10a3.5 3.5 0 0 1-1 6.8H8Z" />
          <path d="M9 17v3" />
          <path d="M15 17v3" />
        </svg>
      );
    case 'raise':
      return <ArrowUpFromLine className={cls} />;
    case 'lower':
      return <ArrowDownToLine className={cls} />;
    case 'remove':
      return <Eraser className={cls} />;
  }
}

function renderCategoryIcon(id: DockCategory) {
  const cls = 'w-4 h-4 shrink-0';
  switch (id) {
    case 'world':
      return <Earth className={cls} />;
    case 'terrain':
      return <MountainSnow className={cls} />;
    case 'structures':
      return <Landmark className={cls} />;
    case 'nature':
      return <Leaf className={cls} />;
    case 'decorations':
      return <Lamp className={cls} />;
    case 'creatures':
      return <PawPrint className={cls} />;
    case 'sky':
      return <CloudSun className={cls} />;
  }
}

/** Items shown in the Sect toolbar for a category (farm-prototype items stay hidden) */
function toolsInCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter(
    (t) => t.category === category && !FARM_PROTOTYPE_TOOLS.includes(t.id),
  );
}

const REMOVE_TOOL = TOOL_DEFINITIONS.find((t) => t.id === 'remove')!;

const BUTTON_BASE =
  'w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border transition-all duration-150';
const BUTTON_IDLE =
  'bg-[#f3ede2] border-[#e2d7c5] text-[#54483c] hover:bg-[#eae1d3] hover:text-[#2b221b] cursor-pointer';

interface ToolDockProps {
  orientation: 'vertical' | 'horizontal';
  activeTool: ToolId | null;
  onSelectTool: (tool: ToolId) => void;
  openCategory: DockCategory | null;
  onOpenCategory: (category: DockCategory | null) => void;
}

/**
 * Icon-only tool dock organized by parent category. It shows the seven categories;
 * opening one swaps in that category's items behind a back button. Remove is pinned
 * at the end in both views.
 */
export function ToolDock({
  orientation,
  activeTool,
  onSelectTool,
  openCategory,
  onOpenCategory,
}: ToolDockProps) {
  const vertical = orientation === 'vertical';
  const stripRef = useRef<HTMLDivElement | null>(null);

  // Opening or closing a category swaps the contents, so start back at the beginning;
  // otherwise a strip scrolled sideways to reach a category hides the back button
  useEffect(() => {
    stripRef.current?.scrollTo({ left: 0, top: 0 });
  }, [openCategory]);
  const activeCategory = activeTool
    ? TOOL_DEFINITIONS.find((t) => t.id === activeTool)?.category
    : undefined;

  const renderToolButton = (tool: ToolDefinition) => {
    const isSelected = activeTool === tool.id;
    return (
      <button
        key={tool.id}
        type="button"
        onClick={() => onSelectTool(tool.id)}
        title={tool.label}
        aria-label={tool.label}
        aria-pressed={isSelected}
        className={`${BUTTON_BASE} ${
          isSelected
            ? `${tool.accentBg} ${tool.accentBorder} ${tool.accentText} shadow-xs cursor-pointer`
            : BUTTON_IDLE
        }`}
      >
        {renderToolIcon(tool.id)}
      </button>
    );
  };

  const openCategoryLabel = TOOL_CATEGORIES.find((c) => c.id === openCategory)?.label;

  return (
    <div
      ref={stripRef}
      className={
        vertical
          ? 'flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-0.5'
          : 'flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 pr-1'
      }
      role="toolbar"
      aria-orientation={orientation}
      aria-label={openCategoryLabel ? `${openCategoryLabel} items` : 'World building categories'}
    >
      {openCategory ? (
        <>
          <button
            type="button"
            onClick={() => onOpenCategory(null)}
            title="Back to categories"
            aria-label="Back to categories"
            className={`${BUTTON_BASE} bg-[#382f27] border-[#261f19] text-[#fcf8f0] hover:bg-[#4d4136] cursor-pointer`}
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
          </button>
          {toolsInCategory(openCategory).map(renderToolButton)}
        </>
      ) : (
        TOOL_CATEGORIES.map((category) => {
          const isEmpty = toolsInCategory(category.id).length === 0;
          const holdsActiveTool = activeCategory === category.id;
          const label = isEmpty ? `${category.label}: coming soon` : category.label;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                if (!isEmpty) onOpenCategory(category.id);
              }}
              title={label}
              aria-label={label}
              aria-disabled={isEmpty}
              className={`${BUTTON_BASE} ${
                isEmpty
                  ? 'bg-[#f3ede2] border-[#e2d7c5] text-[#54483c] opacity-40 cursor-not-allowed'
                  : holdsActiveTool
                    ? 'bg-[#e8dcc6] border-[#b9a17d] text-[#2b221b] shadow-xs cursor-pointer'
                    : BUTTON_IDLE
              }`}
            >
              {renderCategoryIcon(category.id)}
            </button>
          );
        })
      )}

      <div
        className={vertical ? 'w-8 h-px bg-[#e2d7c5] shrink-0' : 'w-px h-8 bg-[#e2d7c5] shrink-0'}
        aria-hidden="true"
      />
      {renderToolButton(REMOVE_TOOL)}
    </div>
  );
}
