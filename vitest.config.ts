import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    clearMocks: true,
    exclude: ['node_modules', 'dist', '.next', '.claude/worktrees/**'],
    testTimeout: 15000,
    // BACKLOG 8.8 Trin 1: 'forks' (process-isolation) i stedet for default
    // 'threads' for at undgå heap-OOM når tunge moduler (Garnlager.jsx, Arkiv.jsx,
    // @zxing/library, pdfjs) indlæses i parallel jsdom-environments. maxWorkers: 2
    // begrænser parallel-belastning så hver fork har eget heap-budget.
    // I Vitest 4 er maxWorkers/minWorkers top-level options (poolOptions deprecated).
    // Heap-loftet pr. worker hæves til 8 GB via NODE_OPTIONS i package.json's test-scripts —
    // Garnlager.jsx-loadingen lækker ~33 MB/s og rammer ellers Node-default på ~4 GB.
    pool: 'forks',
    maxWorkers: 2,
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
