import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Exclude Playwright e2e tests from Vitest
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/*.spec.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
