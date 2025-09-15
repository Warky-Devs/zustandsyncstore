import { defineConfig } from "vite";
import { dirname } from "node:path";
import * as path from "path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { peerDependencies } from "./package.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
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
