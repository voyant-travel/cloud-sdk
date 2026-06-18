import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const voyantCloudRepo = path.resolve(repoRoot, "../voyant-cloud");

const sources = [
  {
    file: path.join(voyantCloudRepo, "apps/api/src/routes/vault.ts"),
    pathPrefix: "/vault/v1",
  },
  {
    // API-token control plane (apps, deployments, runtime logs, databases,
    // storage). The workflow routes in routes/cloud.ts are not mirrored on the
    // SDK client, so only the control-plane file is a manifest source.
    file: path.join(
      voyantCloudRepo,
      "apps/api/src/routes/cloud-control-plane.ts",
    ),
    pathPrefix: "/cloud/v1",
  },
  {
    file: path.join(voyantCloudRepo, "apps/api/src/routes/sms.ts"),
    pathPrefix: "/sms/v1",
  },
  {
    file: path.join(voyantCloudRepo, "apps/api/src/routes/email.ts"),
    pathPrefix: "/email/v1",
  },
  {
    file: path.join(voyantCloudRepo, "apps/api/src/routes/verify.ts"),
    pathPrefix: "/verify/v1",
  },
  {
    file: path.join(voyantCloudRepo, "apps/api/src/routes/video.ts"),
    pathPrefix: "/video/v1",
  },
  // The browser surface is implemented in the voyant-browser-api worker
  // (apps/browser-api/src/app.ts) and the public api gateway forwards
  // /browser/v1/* through. The worker is the source of truth.
  {
    file: path.join(voyantCloudRepo, "apps/browser-api/src/app.ts"),
    operationsFile: path.join(
      voyantCloudRepo,
      "apps/browser-api/src/lib/operation.ts",
    ),
    pathPrefix: "/browser",
  },
  // The realtime surface is implemented in the voyant-realtime-api worker
  // (apps/realtime-api/src/app.ts) and the public api gateway forwards
  // /realtime/v1/* through. The worker is the source of truth.
  //
  // Marked optional until that worker lands in voyant-cloud: when the file is
  // absent we skip /realtime/* (mirroring verify-api-parity.mjs) rather than
  // blocking the manifest refresh for every other product.
  {
    file: path.join(voyantCloudRepo, "apps/realtime-api/src/app.ts"),
    pathPrefix: "/realtime",
    optional: true,
  },
];

const manifestFile = path.join(repoRoot, "generated", "public-routes.json");

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function joinPath(prefix, suffix) {
  if (!prefix) return suffix;
  if (suffix === "/" || suffix === "") return prefix;
  return `${prefix}${suffix.startsWith("/") ? "" : "/"}${suffix}`;
}

function extractRoutes(filePath, pathPrefix) {
  const source = fs.readFileSync(filePath, "utf8");
  return [
    ...source.matchAll(/\bapp\.(get|post|patch|delete|put)\(\s*"([^"]+)"/gs),
  ].map(
    ([, method, route]) =>
      `${method.toUpperCase()} ${joinPath(pathPrefix, route)}`,
  );
}

function extractRenderOperations(operationsFile) {
  const source = fs.readFileSync(operationsFile, "utf8");
  const match = source.match(
    /export\s+const\s+RENDER_OPERATIONS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/,
  );
  if (!match) {
    throw new Error(
      `Could not extract RENDER_OPERATIONS from ${operationsFile}`,
    );
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map(([, name]) => name);
}

function extractBrowserRoutes(file, operationsFile, pathPrefix) {
  const baseRoutes = extractRoutes(file, pathPrefix);
  const renderOps = extractRenderOperations(operationsFile);
  const renderRoutes = renderOps.map(
    (op) => `POST ${joinPath(pathPrefix, `/v1/${op}`)}`,
  );
  return [...baseRoutes, ...renderRoutes];
}

function sourceFilesExist(source) {
  return (
    fileExists(source.file) &&
    (!source.operationsFile || fileExists(source.operationsFile))
  );
}

const missingRequired = sources.filter(
  (source) => !source.optional && !sourceFilesExist(source),
);
if (missingRequired.length > 0) {
  console.error(
    "Unable to sync route manifests: sibling voyant-cloud route files were not found.",
  );
  process.exit(1);
}

const activeSources = sources.filter((source) => {
  if (sourceFilesExist(source)) return true;
  console.log(
    `Skipping ${source.pathPrefix}/* sync: ${path.relative(repoRoot, source.file)} not found in voyant-cloud.`,
  );
  return false;
});

const cloudRoutes = activeSources
  .flatMap((source) => {
    if (source.operationsFile) {
      return extractBrowserRoutes(
        source.file,
        source.operationsFile,
        source.pathPrefix,
      );
    }
    return extractRoutes(source.file, source.pathPrefix);
  })
  .filter((route) => !/\s\/[^/\s]+\/health$/.test(route))
  .sort();

const manifest = { cloud: cloudRoutes };

fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Synced route manifest to ${path.relative(repoRoot, manifestFile)}.`,
);
