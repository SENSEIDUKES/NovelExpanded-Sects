import { Square, X } from 'lucide-react';
import { ToolId } from '../../types/world';
import { getActiveToolMetadata } from './menuConfig';
import { renderToolIcon } from './ToolIcons';

interface ActiveToolHudProps {
  activeTool: ToolId | null;
  onDisarmTool: () => void;
  tourActive: boolean;
  tourPhase: string;
  onStopTour: () => void;
}

/**
 * Floating spatial glass HUD pill.
 * - When a creation or erase tool is armed, appears at the top-center of the viewport
 *   with the tool's icon, name, placement instruction, and a one-tap Done (Esc) button.
 * - When the 30s Cinematic Tour is active, renders a floating bottom-center tour bar.
 */
export function ActiveToolHud({
  activeTool,
  onDisarmTool,
  tourActive,
  tourPhase,
  onStopTour,
}: ActiveToolHudProps) {
  if (tourActive) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-3 pl-4 pr-2.5 py-2 rounded-2xl bg-[#0e1322]/82 backdrop-blur-2xl border border-white/15 text-[#f8fafc] shadow-2xl"
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-white/65 whitespace-nowrap">Cinematic Tour</span>
          {tourPhase && (
            <>
              <span aria-hidden="true" className="text-white/30">
                ·
              </span>
              <span className="font-semibold text-[#86efac] whitespace-nowrap">{tourPhase}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onStopTour}
          className="min-h-[34px] px-3 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Exit Tour</span>
        </button>
      </div>
    );
  }

  const meta = getActiveToolMetadata(activeTool);
  if (!meta) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Active tool: ${meta.label}`}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[calc(100vw-1.5rem)] flex items-center gap-3 pl-3 pr-2 py-2 rounded-2xl bg-[#0e1322]/82 backdrop-blur-2xl border border-white/15 text-[#f8fafc] shadow-2xl transition-all duration-150"
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
          meta.isDestructive
            ? 'bg-rose-500/20 border-rose-400/35 text-rose-300'
            : 'bg-emerald-500/20 border-emerald-400/35 text-emerald-300'
        }`}
      >
        {renderToolIcon(meta.id, 'w-4 h-4 shrink-0')}
      </div>

      <div className="min-w-0 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-white whitespace-nowrap">{meta.label}</span>
          <span aria-hidden="true" className="text-white/30">
            ·
          </span>
          <span className="text-[11px] text-white/60 whitespace-nowrap">{meta.categoryLabel}</span>
        </div>
        <p className="text-[11px] text-white/70 truncate max-w-[220px] sm:max-w-[320px]">
          {meta.instruction}
        </p>
      </div>

      <button
        type="button"
        onClick={onDisarmTool}
        aria-label="Disarm active tool"
        title="Disarm tool (Esc)"
        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 active:scale-95 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
      >
        <span>Done</span>
        <span className="hidden sm:inline-block text-[10px] font-mono-tabular text-white/55">
          Esc
        </span>
        <X className="w-3.5 h-3.5 text-white/70 sm:hidden" />
      </button>
    </div>
  );
}
