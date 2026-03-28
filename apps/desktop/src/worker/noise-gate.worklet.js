let SmartGate = null;
let gate = null;
let wasmInit = null;

// On reçoit le module WASM, la classe SmartGate et la fonction d'init
self.onmessage = async (event) => {
    if (event.data.type === 'INIT_WASM') {
        SmartGate = event.data.SmartGate;
        wasmInit = event.data.init;
        await wasmInit(event.data.module);
        gate = new SmartGate(event.data.threshold, event.data.attack, event.data.release);
    }
};

class NoiseGateProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const input = inputs[0][0];
        const output = outputs[0][0];
        if (gate && input && output) {
            // Traitement in-place
            gate.process(input);
            output.set(input);
        } else if (input && output) {
            output.set(input);
        }
        return true;
    }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);

