import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "apps/api/index": "apps/api/src/index.ts",
    "packages/shared/index": "packages/shared/src/index.ts"
  },
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node20",
  sourcemap: true,
  splitting: false,
  clean: true,
  dts: false,
  noExternal: [/^@marketplace\//]
});
