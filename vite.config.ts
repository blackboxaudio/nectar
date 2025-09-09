/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { resolve } from 'path'
import { defineConfig } from 'vite'
import circleDependency from 'vite-plugin-circular-dependency'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev./config/
export default defineConfig(({}) => ({
    plugins: [
        tsconfigPaths(),
        dts({ insertTypesEntry: true, rollupTypes: true }),
        circleDependency({
            outputFilePath: './circular-deps.json',
            circleImportThrowErr: true,
        }),
    ],
    build: {
        target: 'esnext',
        minify: true,
        sourcemap: false,
        lib: {
            name: '@bbx-audio/nectar',
            formats: ['es'],
            entry: {
                index: resolve(__dirname, './src/index.ts'),
                error: resolve(__dirname, './src/error/index.ts'),
                event: resolve(__dirname, './src/event/index.ts'),
                juce: resolve(__dirname, './src/juce/index.ts'),
                math: resolve(__dirname, './src/math/index.ts'),
                parameter: resolve(__dirname, './src/parameter/index.ts'),
            },
        },
    },
}))
