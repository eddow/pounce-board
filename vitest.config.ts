import path from 'node:path';
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      'pounce-ts/jsx-runtime': path.resolve(__dirname, '../pounce-ts/src/runtime/jsx-runtime.ts'),
      'pounce-ts/jsx-dev-runtime': path.resolve(__dirname, '../pounce-ts/src/runtime/jsx-dev-runtime.ts'),
      'pounce-ts': path.resolve(__dirname, '../pounce-ts/src/lib'),
      'pounce-board/client': path.resolve(__dirname, 'src/client/index.ts'),
      'pounce-board/server': path.resolve(__dirname, 'src/server/index.ts'),
      'pounce-board': path.resolve(__dirname, 'src/server/index.ts'), // Default to server in Node test env
    },
  },
  test: {
    include: ["src/**/*.spec.ts", "tests/integration/**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/tests/**", "**/node_modules/**", "**/dist/**"],
    },
  },
});
