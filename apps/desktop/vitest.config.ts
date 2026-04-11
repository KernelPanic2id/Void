/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const wasmMock = path.resolve(configDir, 'src/__mocks__/pkg/core_wasm.ts');

/** Pre-resolves WASM imports to the test mock before vite:import-analysis. */
function wasmMockPlugin(): Plugin {
    return {
        name: 'wasm-mock-resolve',
        enforce: 'pre',
        resolveId(source) {
            if (/\/pkg\/core_wasm(\.js)?$/.test(source)) {
                return wasmMock;
            }
        },
    };
}

export default defineConfig({
    plugins: [react(), wasmMockPlugin()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        css: false,
    },
});
