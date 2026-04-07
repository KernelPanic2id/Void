/// <reference lib="webworker" />
import './polyfill.js';
import initWasm, { SmartGate, TransientSuppressor, rms_volume, activate_rt_context } from '../pkg/core_wasm.js';
// @ts-ignore
import createRNNWasmModuleSync from './rnnoise-sync.js';
class RingBuffer {
    constructor(size) {
        this.readOffset = 0;
        this.writeOffset = 0;
        this.buffer = new Float32Array(size);
    }
    push(data) {
        for (let i = 0; i < data.length; i++) {
            this.buffer[this.writeOffset % this.buffer.length] = data[i];
            this.writeOffset++;
        }
    }
    pull(out) {
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
    constructor() {
        super();
        this.gate = null;
        this.transientSuppressor = null;
        this.initialized = false;
        this.rnnoiseMod = null;
        this.rnnoiseState = 0;
        this.rnnoiseInPtr = 0;
        this.rnnoiseOutPtr = 0;
        this.inputRingBuffer = new RingBuffer(4096);
        this.outputRingBuffer = new RingBuffer(4096);
        this.frameCount = 0;
        this.port.onmessage = async (event) => {
            if (event.data.type === 'UPDATE_THRESHOLD') {
                if (this.gate) {
                    this.gate.set_threshold(event.data.threshold);
                    this.gate.set_auto_mode(event.data.autoMode);
                }
            }
            else if (event.data.type === 'INIT_WASM') {
                try {
                    await initWasm(event.data.wasmBuffer);
                    // Activate DSP runtime context with host seal
                    if (event.data.rtSeal != null) {
                        activate_rt_context(event.data.rtSeal);
                    }
                    this.gate = new SmartGate(event.data.threshold, event.data.attack, event.data.release);
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
                }
                catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('Erreur d\'initialisation WASM dans le Worklet', e);
                }
            }
        };
    }
    process(inputs, outputs) {
        const input = inputs[0]?.[0];
        const output = outputs[0]?.[0];
        if (!input || !output)
            return true;
        if (this.initialized && this.gate && this.rnnoiseMod) {
            this.inputRingBuffer.push(input);
            while (this.inputRingBuffer.available() >= 480) {
                this.inputRingBuffer.pull(this.rnnoiseInArray);
                for (let i = 0; i < 480; i++)
                    this.rnnoiseInArray[i] *= 32768;
                this.rnnoiseMod._rnnoise_process_frame(this.rnnoiseState, this.rnnoiseOutPtr, this.rnnoiseInPtr);
                for (let i = 0; i < 480; i++)
                    this.rnnoiseOutArray[i] /= 32768;
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
            }
            else {
                output.fill(0);
            }
        }
        else {
            output.set(input);
        }
        return true;
    }
}
registerProcessor('noise-gate-processor', NoiseGateProcessor);
