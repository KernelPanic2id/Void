import Props from "../../models/props.model.ts";
import { useBentoLayout } from "../../hooks/useBentoLayout";
import { useRef } from "react";

export const MainLayout = ({
                             sidebar,
                             children,
                             sidebarFooter,
                             channelName,
                             isInVoice = false,
                           }: Props & { channelName?: string }) => {
  // Use Bento Tactile system for the sidebar
  const {
    ref: sidebarRef,
    x,
    y,
    w,
    h,
    onMove,
    onResize,
  } = useBentoLayout("sidebar");

  // Handler for drag
  const handleSidebarDrag = (e: React.MouseEvent) => {
    // Reference points for relative calculation
    let lastX = e.clientX;
    let lastY = e.clientY;

    const onMoveHandler = (moveEvent: MouseEvent) => {
      // Calculate relative distance since last frame
      const dx = moveEvent.clientX - lastX;
      const dy = moveEvent.clientY - lastY;

      // Update references for next frame
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;

      // Only emit if there is actual movement
      if (dx !== 0 || dy !== 0) {
        onMove({ dx, dy });
      }
    };

    const onUpHandler = () => {
      // Cleanup listeners
      window.removeEventListener("mousemove", onMoveHandler);
      window.removeEventListener("mouseup", onUpHandler);
      document.body.style.cursor = "default";
    };

    // Improve UX by locking cursor during drag
    document.body.style.cursor = "grabbing";

    window.addEventListener("mousemove", onMoveHandler);
    window.addEventListener("mouseup", onUpHandler);
  };

  // Handler for resize (bottom-right corner)
  const handleSidebarResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    let lastX = e.clientX;
    let lastY = e.clientY;
    const onResizeHandler = (moveEvent: MouseEvent) => {
      const dw = moveEvent.clientX - lastX;
      const dh = moveEvent.clientY - lastY;
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
      if (dw !== 0 || dh !== 0) {
        onResize({ dw, dh });
      }
    };
    const onUpHandler = () => {
      window.removeEventListener("mousemove", onResizeHandler);
      window.removeEventListener("mouseup", onUpHandler);
      document.body.style.cursor = "default";
    };
    document.body.style.cursor = "nwse-resize";
    window.addEventListener("mousemove", onResizeHandler);
    window.addEventListener("mouseup", onUpHandler);
  };

  return (
      <div className="relative h-full w-full text-gray-200 select-none overflow-hidden font-sans">
        {/* Main content panel — fills available space */}
        {isInVoice && (
            <div className="absolute inset-2 z-10 rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <main className="flex flex-col h-full min-w-0 relative">
                <header className="h-[48px] flex items-center px-6 border-b border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.3)] glass shrink-0 relative z-20">
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
                  <span className="text-cyan-400/50 mr-3 font-mono font-bold text-lg">#</span>
                  <h1 className="font-bold text-cyan-100/80 text-[13px] uppercase tracking-wider">
                    {channelName || 'vocal-general'}
                  </h1>
                </header>
                <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center">
                  {children}
                </div>
              </main>
            </div>
        )}

        {/* Channel sidebar — draggable & resizable floating panel */}
        <div
            ref={sidebarRef}
            className="absolute z-20"
            style={{
              left: x,
              top: y,
              width: w,
              height: h,
              maxHeight: 'calc(100% - 16px)',
              maxWidth: 'calc(100% - 16px)',
              overflow: 'visible',
            }}
        >
          <aside className="relative z-10 h-full w-full glass-heavy flex flex-col rounded-2xl border border-white/[0.06] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            {/* Drag handle */}
            <div
                onMouseDown={handleSidebarDrag}
                className="shrink-0 h-6 cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
              {sidebar}
            </div>

            {sidebarFooter && (
                <div className="shrink-0 glass border-t border-cyan-500/10 rounded-b-2xl">
                  {sidebarFooter}
                </div>
            )}

            {/* Resize handle bottom-right */}
            <div
                onMouseDown={handleSidebarResize}
                className="absolute right-0 bottom-0 w-4 h-4 z-30 cursor-nwse-resize bg-cyan-400/30 rounded-br-2xl flex items-end justify-end"
                style={{ touchAction: 'none' }}
            >
              <div className="w-3 h-3 bg-cyan-400/60 rounded-br-2xl" />
            </div>
          </aside>
        </div>
      </div>
  );
};
