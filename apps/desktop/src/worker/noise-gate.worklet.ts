/// <reference lib="webworker" />

interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new (options?: any): AudioWorkletProcessor;
};

declare function registerProcessor(name: string, processorCtor: any): void;

class NoiseGateProcessor extends AudioWorkletProcessor {
    private gate: any = null;
    private initialized = false;

    constructor() {
        super();
        this.port.onmessage = async (event: MessageEvent) => {
            if (event.data.type === 'INIT_WASM') {
                try {
                    // Import dynamique du module JS généré par wasm-bindgen
                    const wasm = await import(event.data.wasmJsPath);
                    await wasm.default(event.data.wasmBinPath); // Initialise le module WASM
                    this.gate = new wasm.SmartGate(
                        event.data.threshold,
                        event.data.attack,
                        event.data.release
                    );
                    this.initialized = true;
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('Erreur d\'initialisation WASM dans le Worklet', e);
                }
            }
        };
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
        const input = inputs[0]?.[0];
        const output = outputs[0]?.[0];
        if (!input || !output) return true;

        if (this.initialized && this.gate) {
            this.gate.process(input);
            output.set(input);
        } else {
            output.set(input);
        }
        return true;
    }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);