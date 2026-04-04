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

import './polyfill.js';
import initWasm, { SmartGate, TransientSuppressor, rms_volume } from '../pkg/core_wasm.js';
// @ts-ignore
import createRNNWasmModuleSync from './rnnoise-sync.js';

class RingBuffer {
    private buffer: Float32Array;
    private readOffset = 0;
    private writeOffset = 0;
    constructor(size: number) {
        this.buffer = new Float32Array(size);
    }
    push(data: Float32Array) {
        for (let i = 0; i < data.length; i++) {
            this.buffer[this.writeOffset % this.buffer.length] = data[i];
            this.writeOffset++;
        }
    }
    pull(out: Float32Array) {
        for (let i = 0; i < out.length; i++) {
            out[i] = this.buffer[this.readOffset % this.buffer.length];
            this.readOffset++;
        }
    }
    available() {
        return this.writeOffset - this.readOffset;
    }
}

class NoiseGateProcessor extends AudioWorkletProcessor {
    private gate: any = null;
    private transientSuppressor: any = null;
    private initialized = false;
    private rnnoiseMod: any = null;
    private rnnoiseState: number = 0;
    private rnnoiseInPtr: number = 0;
    private rnnoiseOutPtr: number = 0;
    private rnnoiseInArray!: Float32Array;
    private rnnoiseOutArray!: Float32Array;
    
    private inputRingBuffer = new RingBuffer(4096);
    private outputRingBuffer = new RingBuffer(4096);
    
    private frameCount = 0;

    constructor() {
        super();
        this.port.onmessage = async (event: MessageEvent) => {
            if (event.data.type === 'UPDATE_THRESHOLD') {
                if (this.gate) {
                    this.gate.set_threshold(event.data.threshold);
                    this.gate.set_auto_mode(event.data.autoMode);
                }
            } else if (event.data.type === 'INIT_WASM') {
                try {
                    await initWasm(event.data.wasmBuffer); // Initialise le module WASM avec le chemin du binaire
                    this.gate = new SmartGate(
                        event.data.threshold,
                        event.data.attack,
                        event.data.release
                    );
                    this.gate.set_auto_mode(event.data.autoMode || false);
                    
                    // Init TransientSuppressor for keyboard clicks
                    this.transientSuppressor = new TransientSuppressor();
                    
                    // Init RNNoise
                    this.rnnoiseMod = await createRNNWasmModuleSync();
                    this.rnnoiseState = this.rnnoiseMod._rnnoise_create(null);
                    this.rnnoiseInPtr = this.rnnoiseMod._malloc(480 * 4);
                    this.rnnoiseOutPtr = this.rnnoiseMod._malloc(480 * 4);
                    this.rnnoiseInArray = new Float32Array(this.rnnoiseMod.HEAPF32.buffer, this.rnnoiseInPtr, 480);
                    this.rnnoiseOutArray = new Float32Array(this.rnnoiseMod.HEAPF32.buffer, this.rnnoiseOutPtr, 480);

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

        if (this.initialized && this.gate && this.rnnoiseMod) {
            this.inputRingBuffer.push(input);
            
            while (this.inputRingBuffer.available() >= 480) {
                this.inputRingBuffer.pull(this.rnnoiseInArray);
                for (let i = 0; i < 480; i++) this.rnnoiseInArray[i] *= 32768;
                this.rnnoiseMod._rnnoise_process_frame(this.rnnoiseState, this.rnnoiseOutPtr, this.rnnoiseInPtr);
                for (let i = 0; i < 480; i++) this.rnnoiseOutArray[i] /= 32768;
                this.outputRingBuffer.push(this.rnnoiseOutArray);
            }
            
            if (this.outputRingBuffer.available() >= output.length) {
                this.outputRingBuffer.pull(output);
                
                // Envoi régulier du volume réel (RMS via WASM) au thread principal avant que la gate ne muter le signal
                if (this.frameCount++ % 4 === 0) {
                    const volume = rms_volume(output);
                    this.port.postMessage({ type: 'volume', volume });
                }

                // Suppress high transient clicks (like mechanical keyboards)
                if (this.transientSuppressor) {
                    this.transientSuppressor.process(output);
                }

                // SmartGate processing applied to the output frame (noise suppressed)
                this.gate.process(output);
            } else {
                output.fill(0);
            }
        } else {
            output.set(input);
        }
        return true;
    }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);