import { Check, Sparkles, X } from 'lucide-react';
import { ToolId, WorldState } from '../../types/world';
import { PAGODA_STYLES, PagodaStyleId } from '../../three/pagodaStyles';
import { WORLD_TYPES, WorldTypeId } from '../../three/worldTypes';
import {
  CATEGORY_METADATA,
  DockCategory,
  getCategoryItemCount,
  getToolsForCategory,
  getToolLiveCount,
  PAGODA_STYLE_DESCRIPTIONS,
  WORLD_TYPE_DESCRIPTIONS,
} from './menuConfig';
import { PagodaSwatch, renderCategoryIcon, renderToolIcon, WorldSwatch } from './ToolIcons';

interface CategoryPopoverProps {
  category: DockCategory | null;
  onClose: () => void;
  activeTool: ToolId | null;
  onSelectTool: (tool: ToolId) => void;
  worldType: WorldTypeId;
  onSelectWorldType: (world: WorldTypeId) => void;
  pagodaStyle: PagodaStyleId;
  onSelectPagodaStyle: (style: PagodaStyleId) => void;
  objectCounts: WorldState['objectCounts'];
}

/**
 * Apple Pro floating glass popover displaying a 2-column grid of labeled tool cards
 * (or planetary biome swatches when 'world' is selected, and the pagoda's looks atop
 * 'structures').
 */
export function CategoryPopover({
  category,
  onClose,
  activeTool,
  onSelectTool,
  worldType,
  onSelectWorldType,
  pagodaStyle,
  onSelectPagodaStyle,
  objectCounts,
}: CategoryPopoverProps) {
  if (!category) return null;

  const meta = CATEGORY_METADATA[category];
  const tools = getToolsForCategory(category);
  const itemCount = getCategoryItemCount(category);

  const toolGrid = (
    <div className="grid grid-cols-2 gap-2">
      {tools.map((tool) => {
        const isSelected = activeTool === tool.id;
        const liveCount = getToolLiveCount(tool.id, objectCounts);
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.id)}
            aria-pressed={isSelected}
            className={`group p-3 rounded-2xl border text-left flex flex-col justify-between gap-2.5 min-h-[88px] transition-all duration-150 cursor-pointer active:scale-[0.98] ${
              isSelected
                ? 'bg-emerald-500/18 border-emerald-400/50 text-white shadow-sm'
                : 'bg-white/[0.04] border-white/8 text-white/85 hover:bg-white/[0.09] hover:border-white/18'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
                  isSelected
                    ? 'bg-emerald-400/25 border-emerald-300/40 text-emerald-200'
                    : 'bg-white/8 border-white/10 text-white/80 group-hover:text-white group-hover:bg-white/12'
                }`}
              >
                {renderToolIcon(tool.id, 'w-4 h-4 shrink-0')}
              </div>

              {liveCount !== null && (
                <span className="text-[11px] font-mono-tabular text-white/50">
                  {liveCount}
                </span>
              )}
            </div>

            <div className="min-w-0 w-full">
              <div className="text-xs font-semibold text-white whitespace-nowrap truncate">
                {tool.label}
              </div>
              <p className="text-[11px] text-white/55 line-clamp-2 leading-snug mt-0.5">
                {tool.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <section
      role="dialog"
      aria-label={`${meta.label} creation palette`}
      className="fixed z-30 pointer-events-auto bottom-21 left-3 right-3 md:left-auto md:bottom-auto md:right-21 md:top-1/2 md:-translate-y-1/2 md:w-[360px] max-h-[68vh] md:max-h-[78vh] flex flex-col rounded-3xl bg-[#0e1322]/84 backdrop-blur-2xl border border-white/14 text-[#f8fafc] shadow-2xl overflow-hidden transition-all duration-150"
    >
      {/* Popover Header */}
      <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center text-white/90 shrink-0">
            {renderCategoryIcon(category, 'w-4 h-4')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-white truncate">
                {meta.label}
              </h2>
              <span aria-hidden="true" className="text-white/25 text-xs">
                ·
              </span>
              <span className="text-[11px] font-mono-tabular text-white/55 whitespace-nowrap">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-[11px] text-white/60 truncate">{meta.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${meta.label} palette`}
          title="Close palette (Esc)"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Popover Body */}
      <div className="p-3.5 overflow-y-auto no-scrollbar">
        {category === 'world' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
            {WORLD_TYPES.map((world) => {
              const isSelected = world.id === worldType;
              return (
                <button
                  key={world.id}
                  type="button"
                  onClick={() => onSelectWorldType(world.id)}
                  aria-pressed={isSelected}
                  className={`group w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/16 border-emerald-400/45 text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/8 text-white/85 hover:bg-white/[0.09] hover:border-white/16'
                  }`}
                >
                  <WorldSwatch world={world} sizeClass="w-8 h-8" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {world.label}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-white/60 line-clamp-1 mt-0.5">
                      {WORLD_TYPE_DESCRIPTIONS[world.id]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : category === 'structures' ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Pagoda
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                {PAGODA_STYLES.map((style) => {
                  const isSelected = style.id === pagodaStyle;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onSelectPagodaStyle(style.id)}
                      aria-pressed={isSelected}
                      className={`group w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/16 border-emerald-400/45 text-white shadow-sm'
                          : 'bg-white/[0.04] border-white/8 text-white/85 hover:bg-white/[0.09] hover:border-white/16'
                      }`}
                    >
                      <PagodaSwatch style={style} sizeClass="w-9 h-9" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {style.label}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-white/60 line-clamp-1 mt-0.5">
                          {PAGODA_STYLE_DESCRIPTIONS[style.id]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {tools.length > 0 && toolGrid}
          </div>
        ) : tools.length === 0 ? (
          <div className="py-8 px-4 text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center text-white/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-white/85">
              Sect Architecture Coming Soon
            </p>
            <p className="text-[11px] text-white/55 max-w-[240px]">
              Sacred halls, meditation pavilions, and mountain bridges are being forged for this category.
            </p>
          </div>
        ) : (
          toolGrid
        )}
      </div>
    </section>
  );
}
