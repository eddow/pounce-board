import path from 'node:path';
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      'pounce-ts/jsx-runtime': path.resolve(__dirname, '../pounce-ts/src/runtime/jsx-runtime.ts'),
      'pounce-ts/jsx-dev-runtime': path.resolve(__dirname, '../pounce-ts/src/runtime/jsx-dev-runtime.ts'),
      'pounce-ts': path.resolve(__dirname, '../pounce-ts/src'),
      'pounce-ui': path.resolve(__dirname, '../pounce-ui/src'),
      'mutts': path.resolve(__dirname, '../mutts/src'),
      'npc-script': path.resolve(__dirname, '../npcs/src'),
      'omni18n': path.resolve(__dirname, '../omni18n/src'),
      'pounce-board/client': path.resolve(__dirname, 'src/client'),
      'pounce-board/server': path.resolve(__dirname, 'src/server'),
      'pounce-board': path.resolve(__dirname, 'src'), // Default to server in Node test env
    },
  },
  test: {
    include: ["src/**/*.spec.ts", "tests/integration/**/*.spec.ts"],
    environment: "node",
    setupFiles: ["tests/setup-mutts.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/tests/**", "**/node_modules/**", "**/dist/**"],
    },
  },
});
