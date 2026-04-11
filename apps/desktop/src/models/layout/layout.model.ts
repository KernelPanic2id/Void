/**
 * Layout model for Bento Tactile system.
 * Positions and sizes are stored as fractions (0.0–1.0) of the container.
 * @see Used for communication between React and Rust (Tauri)
 */
export interface LayoutWindow {
  /** Unique identifier for the window/panel */
  id: string;
  /** X position as fraction of container width (0.0–1.0) */
  x: number;
  /** Y position as fraction of container height (0.0–1.0) */
  y: number;
  /** Width as fraction of container width (0.0–1.0) */
  w: number;
  /** Height as fraction of container height (0.0–1.0) */
  h: number;
  /** Optional: z-index for stacking order */
  z?: number;
}

/**
 * Batch update sent by Rust to React.
 * @property windows Array of updated window layouts
 */
export interface LayoutBatchUpdate {
  windows: LayoutWindow[];
}

/**
 * Context value for BentoLayout state management.
 */
export interface BentoLayoutContextValue {
  windows: LayoutWindow[];
  setWindows: (windows: LayoutWindow[]) => void;
  updateBatch: (batch: LayoutBatchUpdate) => void;
}

