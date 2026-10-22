import { SlidersHorizontal } from 'lucide-react';
import {
  TOOL_CATEGORIES,
  TOOL_DEFINITIONS,
  ToolId,
} from '../types/world';
import {
  CATEGORY_METADATA,
  DockCategory,
  getToolsForCategory,
} from './menu/menuConfig';
import { renderCategoryIcon, renderToolIcon } from './menu/ToolIcons';

export type { DockCategory };

const REMOVE_TOOL = TOOL_DEFINITIONS.find((t) => t.id === 'remove')!;

interface ToolDockProps {
  orientation: 'vertical' | 'horizontal';
  activeTool: ToolId | null;
  onSelectTool: (tool: ToolId) => void;
  openCategory: DockCategory | null;
  onToggleCategory: (category: DockCategory) => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
}

/**
 * Floating Apple Pro Creation Dock (visionOS / Shapr3D style).
 * Remains persistently anchored so creators keep spatial muscle memory across
 * the 7 creation categories, the World Inspector, and the pinned Erase brush.
 */
export function ToolDock({
  orientation,
  activeTool,
  onSelectTool,
  openCategory,
  onToggleCategory,
  inspectorOpen,
  onToggleInspector,
}: ToolDockProps) {
  const vertical = orientation === 'vertical';

  const activeCategory = activeTool
    ? TOOL_DEFINITIONS.find((t) => t.id === activeTool)?.category
    : undefined;

  const isRemoveArmed = activeTool === REMOVE_TOOL.id;

  return (
    <nav
      role="toolbar"
      aria-orientation={orientation}
      aria-label="Pro world creation dock"
      className={
        vertical
          ? 'flex flex-col items-center gap-1.5 p-2 rounded-3xl bg-[#0e1322]/80 backdrop-blur-2xl border border-white/14 shadow-2xl'
          : 'flex items-center gap-1.5 px-2.5 py-2 rounded-3xl bg-[#0e1322]/84 backdrop-blur-2xl border border-white/14 shadow-2xl overflow-x-auto no-scrollbar max-w-full'
      }
    >
      {/* 1. World Inspector Trigger */}
      <button
        type="button"
        onClick={onToggleInspector}
        title="World Inspector — Camera, Sky & Stats"
        aria-label="World Inspector"
        aria-expanded={inspectorOpen}
        className={`relative min-w-[44px] min-h-[44px] w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-150 cursor-pointer active:scale-95 ${
          inspectorOpen
            ? 'bg-white text-[#0b0f1c] border-white shadow-md'
            : 'bg-white/[0.06] border-white/10 text-white/85 hover:bg-white/14 hover:text-white'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4 shrink-0" />
      </button>

      {/* Specular Hairline Divider */}
      <div
        className={
          vertical
            ? 'w-6 h-px bg-white/12 my-0.5 shrink-0'
            : 'w-px h-6 bg-white/12 mx-0.5 shrink-0'
        }
        aria-hidden="true"
      />

      {/* 2. Persistent 7 Category Triggers */}
      {TOOL_CATEGORIES.map((category) => {
        const meta = CATEGORY_METADATA[category.id];
        const isOpen = openCategory === category.id;
        const holdsArmedTool = activeCategory === category.id;
        const isEmpty =
          category.id !== 'world' && getToolsForCategory(category.id).length === 0;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onToggleCategory(category.id)}
            title={`${meta.label} (${meta.shortcut})${isEmpty ? ' — Coming soon' : ''}`}
            aria-label={`${meta.label} category`}
            aria-expanded={isOpen}
            className={`group relative min-w-[44px] min-h-[44px] w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-150 cursor-pointer active:scale-95 ${
              isOpen
                ? 'bg-emerald-400/22 border-emerald-300/55 text-emerald-200 shadow-sm'
                : holdsArmedTool
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                  : isEmpty
                    ? 'bg-white/[0.02] border-transparent text-white/40 hover:bg-white/[0.06] hover:text-white/65'
                    : 'bg-white/[0.04] border-transparent text-white/75 hover:bg-white/12 hover:border-white/12 hover:text-white'
            }`}
          >
            {renderCategoryIcon(category.id, 'w-4 h-4 shrink-0')}

            {/* Subtle shortcut number in bottom-right corner on desktop */}
            <span
              aria-hidden="true"
              className="hidden md:block absolute bottom-1 right-1.5 text-[9px] font-mono-tabular leading-none text-white/35 group-hover:text-white/65"
            >
              {meta.shortcut}
            </span>

            {/* Armed tool indicator bar on the left/bottom edge of the button */}
            {holdsArmedTool && !isOpen && (
              <span
                aria-hidden="true"
                className={
                  vertical
                    ? 'absolute left-0.5 top-3 bottom-3 w-0.5 rounded-full bg-emerald-300'
                    : 'absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-emerald-300'
                }
              />
            )}
          </button>
        );
      })}

      {/* Specular Hairline Divider */}
      <div
        className={
          vertical
            ? 'w-6 h-px bg-white/12 my-0.5 shrink-0'
            : 'w-px h-6 bg-white/12 mx-0.5 shrink-0'
        }
        aria-hidden="true"
      />

      {/* 3. Pinned Erase / Remove Utility Brush */}
      <button
        type="button"
        onClick={() => onSelectTool(REMOVE_TOOL.id)}
        title={`${REMOVE_TOOL.label} (X / Delete)`}
        aria-label={REMOVE_TOOL.label}
        aria-pressed={isRemoveArmed}
        className={`relative min-w-[44px] min-h-[44px] w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-150 cursor-pointer active:scale-95 ${
          isRemoveArmed
            ? 'bg-rose-500/25 border-rose-400/55 text-rose-200 shadow-sm'
            : 'bg-white/[0.04] border-transparent text-white/75 hover:bg-rose-500/15 hover:border-rose-400/30 hover:text-rose-200'
        }`}
      >
        {renderToolIcon(REMOVE_TOOL.id, 'w-4 h-4 shrink-0')}
      </button>
    </nav>
  );
}
