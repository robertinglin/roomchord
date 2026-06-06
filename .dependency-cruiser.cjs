const fs = require("node:fs");
const path = require("node:path");

const srcRoot = path.join(__dirname, "frontend", "src");

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

function slicesFor(layer) {
  const layerDir = path.join(srcRoot, layer);
  if (!fs.existsSync(layerDir)) return [];
  return fs.readdirSync(layerDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function isolatedSliceRules(layer) {
  return slicesFor(layer).map((slice) => {
    const escaped = escapeRegex(slice);
    return {
      name: `fsd-${layer}-${slice}-is-isolated`,
      severity: "error",
      comment: "FSD slices in the same layer must not import sibling slices.",
      from: { path: `^frontend/src/${layer}/${escaped}/` },
      to: { path: `^frontend/src/${layer}/(?!${escaped}/)` }
    };
  });
}

const lowerLayerRules = [
  ["shared", "app|pages|widgets|features|entities"],
  ["entities", "app|pages|widgets|features"],
  ["features", "app|pages|widgets"],
  ["widgets", "app|pages"],
  ["pages", "app"]
].map(([fromLayer, blockedLayers]) => ({
  name: `fsd-${fromLayer}-not-to-higher-layers`,
  severity: "error",
  comment: "FSD lower layers may not import higher layers.",
  from: { path: `^frontend/src/${fromLayer}/` },
  to: { path: `^frontend/src/(?:${blockedLayers})/` }
}));

module.exports = {
  forbidden: [
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true }
    },
    {
      name: "fsd-entry-imports-app-only",
      severity: "error",
      comment: "The Vite entry adapter should delegate into the app layer.",
      from: { path: "^frontend/src/index\\.tsx$" },
      to: { path: "^frontend/src/(?!app/)" }
    },
    ...lowerLayerRules,
    ...isolatedSliceRules("pages"),
    ...isolatedSliceRules("widgets"),
    ...isolatedSliceRules("features"),
    ...isolatedSliceRules("entities")
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
      dependencyTypes: [
        "npm",
        "npm-dev",
        "npm-optional",
        "npm-peer",
        "npm-bundled",
        "npm-no-pkg"
      ]
    },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "browser", "node", "default"],
      exportsFields: ["exports"]
    },
    includeOnly: "^frontend/src",
    skipAnalysisNotInRules: true,
    tsConfig: { fileName: path.join(__dirname, "frontend", "tsconfig.json") },
    tsPreCompilationDeps: true
  }
};
