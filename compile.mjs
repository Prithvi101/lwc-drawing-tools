import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { build, defineConfig } from "vite";
import { fileURLToPath } from "url";
import { generateDtsBundle } from "dts-bundle-generator";

const __filename = fileURLToPath(import.meta.url);
const currentDir = dirname(__filename);

const PACKAGE_NAME = "lwc-plugin-drawing-tools";
const ENTRY_FILE = resolve(currentDir, "src/index.ts");
const DIST_DIR = resolve(currentDir, "dist");

// --------------------------------------------------
// Ensure dist folder exists
// --------------------------------------------------
if (!existsSync(DIST_DIR)) {
  mkdirSync(DIST_DIR);
}

// --------------------------------------------------
// Vite build config (JS runtime)
// --------------------------------------------------
const buildConfig = defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    copyPublicDir: false,
    lib: {
      entry: ENTRY_FILE, // 🔴 SINGLE SOURCE OF TRUTH
      name: "DrawingPlugin", // UMD global
      formats: ["es", "umd"],
      fileName: PACKAGE_NAME,
    },
    rollupOptions: {
      external: ["lightweight-charts", "fancy-canvas"],
      output: {
        globals: {
          "lightweight-charts": "LightweightCharts",
        },
      },
    },
  },
});

// --------------------------------------------------
// Build package.json for dist
// --------------------------------------------------
function buildPackageJson() {
  return {
    name: PACKAGE_NAME,
    version: "1.0.0",
    keywords: ["lwc-plugin", "lightweight-charts"],
    type: "module",

    main: `./${PACKAGE_NAME}.umd.cjs`,
    module: `./${PACKAGE_NAME}.js`,
    types: `./${PACKAGE_NAME}.d.ts`,

    exports: {
      ".": {
        import: `./${PACKAGE_NAME}.js`,
        require: `./${PACKAGE_NAME}.umd.cjs`,
        types: `./${PACKAGE_NAME}.d.ts`,
      },
    },
  };
}

// --------------------------------------------------
// Build
// --------------------------------------------------
console.log("⚡️ Starting");
console.log("Bundling the plugin...");
await build(buildConfig);

// --------------------------------------------------
// Write dist/package.json
// --------------------------------------------------
console.log("Generating package.json...");
writeFileSync(
  resolve(DIST_DIR, "package.json"),
  JSON.stringify(buildPackageJson(), null, 2),
  "utf-8"
);

// --------------------------------------------------
// Generate typings (🔥 FIXED 🔥)
// --------------------------------------------------
console.log("Generating typings...");
const typings = generateDtsBundle([
  {
    filePath: "./src/index.ts", // 🔴 MUST be index.ts
  },
]);

const dtsPath = resolve(DIST_DIR, `${PACKAGE_NAME}.d.ts`);
writeFileSync(dtsPath, typings.join("\n"), "utf-8");

// CJS typings (for require)
copyFileSync(dtsPath, resolve(DIST_DIR, `${PACKAGE_NAME}.d.cts`));

console.log("🎉 Done");
