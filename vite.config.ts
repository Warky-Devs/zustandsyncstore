import { defineConfig } from "vite";
import { dirname } from "node:path";
import * as path from "path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { peerDependencies } from "./package.json";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
  
    dts({
      outDir: "dist",
      entryRoot: "src",
      staticImport: true,
    }),
      react(),
  ],

  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/lib.ts"),
      name: "lib",
      formats: ["es", "cjs"],
      fileName: (format) => `lib.${format}.js`,
    },
    emptyOutDir: true,
    rollupOptions: {
      external: Object.keys(peerDependencies),
    },
  },
});
