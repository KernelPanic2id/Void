import { useEffect, useCallback } from "react";
import { useBentoLayoutContext } from "../context/BentoLayoutContext";
import { listen, emit } from "@tauri-apps/api/event"; // API Officielle

export function useBentoLayout(windowId: string) {
  const { windows, updateBatch } = useBentoLayoutContext();

  // 1. ÉCOUTER les mises à jour de Rust
  useEffect(() => {
    let unlisten: any;

    const setupListener = async () => {
      unlisten = await listen("bento:layout:update", (event: any) => {
        // Dans Tauri v2, le payload est parfois déjà un objet, parfois une string
        const data = typeof event.payload === "string"
            ? JSON.parse(event.payload)
            : event.payload;

        updateBatch(data);
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [updateBatch]);

  // 2. TROUVER les données de cette fenêtre
  const layout = windows.find(w => w.id === windowId);

  // 3. EMETTRE le mouvement vers Rust
  const emitMove = useCallback((delta: { dx: number; dy: number }) => {
    emit("bento:layout:move", { id: windowId, ...delta });
  }, [windowId]);

  // 4. EMETTRE le resize vers Rust
  const emitResize = useCallback((delta: { dw: number; dh: number }) => {
    emit("bento:layout:resize", { id: windowId, ...delta });
  }, [windowId]);

  return {
    x: layout?.x ?? 100, // Position par défaut si Rust n'a pas encore répondu
    y: layout?.y ?? 100,
    w: layout?.w ?? 240,
    h: layout?.h ?? 500,
    onMove: emitMove,
    onResize: emitResize,
  };
}