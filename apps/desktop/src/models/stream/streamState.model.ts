export default interface StreamState {
    isStreaming: boolean;
    isWasmReady: boolean;
    metrics: { lum: number; status: string };
    stream: MediaStream | null;
    startCapture: () => Promise<void>;
    stopCapture: () => void;
}