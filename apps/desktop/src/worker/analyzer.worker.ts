import init, { analyze_frame } from "../pkg";

type AnalyzerWorkerIncomingMessage = {
    type: 'ANALYZE';
    imageData: ArrayBuffer;
    width: number;
    height: number;
};

let wasmReady = false;

const extractLuminosity = (rawResult: string): number => {
    const match = rawResult.match(/(\d+)\s*$/);
    return match ? Number.parseInt(match[1], 10) : 0;
};

init()
    .then(() => {
        wasmReady = true;
        self.postMessage({ type: 'READY' });
    })
    .catch((err) => {
        const error = `WASM init failed: ${String(err)}`;
        console.error(error);
        self.postMessage({ type: 'ERROR', error });
    });

self.onmessage = (e: MessageEvent<AnalyzerWorkerIncomingMessage>) => {
    const { type, imageData, width, height } = e.data;

    if (type !== 'ANALYZE' || !imageData) {
        return;
    }

    if (!wasmReady) {
        self.postMessage({ type: 'ERROR', error: 'WASM not ready yet' });
        return;
    }

    try {
        const raw = analyze_frame(new Uint8Array(imageData), width, height);
        const lum = extractLuminosity(raw);

        self.postMessage({
            type: 'RESULT',
            payload: {
                lum,
                status: lum > 220 ? 'BRIGHT' : 'OK',
                raw,
            },
        });
    } catch (error) {
        const message = `Rust analysis failed: ${String(error)}`;
        console.error(message);
        self.postMessage({ type: 'ERROR', error: message });
    }
};
