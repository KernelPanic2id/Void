import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'device_fingerprint';

/**
 * Collects browser hardware signals and produces a stable device fingerprint
 * via the WASM `compute_fingerprint` function. The result is cached in
 * localStorage so the hash stays consistent across sessions.
 */
export function useFingerprint(wasmReady: boolean) {
    const fingerprintRef = useRef<string | null>(
        localStorage.getItem(STORAGE_KEY),
    );

    useEffect(() => {
        if (!wasmReady || fingerprintRef.current) return;

        (async () => {
            try {
                const wasm = await import('../pkg/core_wasm');
                if (typeof wasm.compute_fingerprint !== 'function') return;
                const signals = collectSignals();
                const hash = wasm.compute_fingerprint(signals);
                fingerprintRef.current = hash;
                localStorage.setItem(STORAGE_KEY, hash);
            } catch {
                /* WASM unavailable — fingerprint stays null */
            }
        })();
    }, [wasmReady]);

    return fingerprintRef;
}

/**
 * Gathers deterministic hardware & rendering signals from the browser.
 * @returns Concatenated signal string consumed by WASM.
 */
function collectSignals(): string {
    const parts: string[] = [];

    parts.push(String(navigator.hardwareConcurrency ?? 0));
    parts.push(navigator.platform ?? '');
    parts.push(navigator.language ?? '');
    parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

    try {
        const _ctx = new OfflineAudioContext(1, 1, 44100);
        parts.push(String(_ctx.sampleRate));
    } catch {
        parts.push('0');
    }

    try {
        const _canvas = document.createElement('canvas');
        const _gl = _canvas.getContext('webgl') ?? _canvas.getContext('experimental-webgl');
        if (_gl && _gl instanceof WebGLRenderingContext) {
            const _dbg = _gl.getExtension('WEBGL_debug_renderer_info');
            if (_dbg) {
                parts.push(_gl.getParameter(_dbg.UNMASKED_VENDOR_WEBGL) ?? '');
                parts.push(_gl.getParameter(_dbg.UNMASKED_RENDERER_WEBGL) ?? '');
            }
        }
    } catch {
        /* WebGL unavailable */
    }

    try {
        const _canvas = document.createElement('canvas');
        _canvas.width = 64;
        _canvas.height = 16;
        const _ctx2d = _canvas.getContext('2d');
        if (_ctx2d) {
            _ctx2d.fillStyle = '#f0f';
            _ctx2d.fillRect(0, 0, 64, 16);
            _ctx2d.font = '12px monospace';
            _ctx2d.fillText('Void\u00A9', 2, 12);
            parts.push(_canvas.toDataURL().slice(-32));
        }
    } catch {
        /* Canvas unavailable */
    }

    return parts.join('|');
}

