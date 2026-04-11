/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const wasmMock = path.resolve(__dirname, 'src/__mocks__/pkg/core_wasm.ts');

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: /.*\/pkg\/core_wasm(\.js)?$/, replacement: wasmMock },
        ],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        css: false,
    },
});
