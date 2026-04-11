import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Custom window title bar replacing the native OS decoration.
 * Provides drag region and minimize/maximize/close buttons matching the app design.
 */
export const TitleBar = () => {
    const appWindow = getCurrentWindow();

    const handleDrag = (e: React.MouseEvent) => {
        // Only drag on left click, not on buttons
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest("button")) return;
        e.preventDefault();
        appWindow.startDragging();
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        appWindow.toggleMaximize();
    };

    return (
        <div
            onMouseDown={handleDrag}
            onDoubleClick={handleDoubleClick}
            className="h-8 flex items-center justify-between bg-[#020208]/25 backdrop-blur-sm select-none shrink-0 relative z-50 border-b border-white/[0.04]"
        >
            {/* App title */}
            <div className="flex items-center gap-2 pl-3 flex-1 h-full pointer-events-none">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400/60">
                    VOID
                </span>
            </div>

            {/* Window controls */}
            <div className="flex items-center h-full">
                <button
                    onClick={() => appWindow.minimize()}
                    className="h-full w-11 flex items-center justify-center text-cyan-100/40 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={() => appWindow.toggleMaximize()}
                    className="h-full w-11 flex items-center justify-center text-cyan-100/40 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors"
                >
                    <Square size={11} />
                </button>
                <button
                    onClick={() => appWindow.close()}
                    className="h-full w-11 flex items-center justify-center text-cyan-100/40 hover:bg-red-500/80 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

