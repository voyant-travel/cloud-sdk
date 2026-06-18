import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const voyantCloudRepo = path.resolve(repoRoot, "../voyant-cloud");
const manifestFile = path.join(repoRoot, "generated", "public-routes.json");

const vaultRoutesFile = path.join(
  voyantCloudRepo,
  "apps/api/src/routes/vault.ts",
);
const cloudControlPlaneRoutesFile = path.join(
  voyantCloudRepo,
  "apps/api/src/routes/cloud-control-plane.ts",
);
const smsRoutesFile = path.join(voyantCloudRepo, "apps/api/src/routes/sms.ts");
const emailRoutesFile = path.join(
  voyantCloudRepo,
  "apps/api/src/routes/email.ts",
);
const verifyRoutesFile = path.join(
  voyantCloudRepo,
  "apps/api/src/routes/verify.ts",
);
const videoRoutesFile = path.join(
  voyantCloudRepo,
  "apps/api/src/routes/video.ts",
);
const browserAppFile = path.join(
  voyantCloudRepo,
  "apps/browser-api/src/app.ts",
);
const browserOperationsFile = path.join(
  voyantCloudRepo,
  "apps/browser-api/src/lib/operation.ts",
);
const realtimeAppFile = path.join(
  voyantCloudRepo,
  "apps/realtime-api/src/app.ts",
);

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function joinPath(prefix, suffix) {
  if (!prefix) return suffix;
  if (suffix === "/" || suffix === "") return prefix;
  return `${prefix}${suffix.startsWith("/") ? "" : "/"}${suffix}`;
}

function extractRoutes(filePath, pathPrefix = "") {
  const source = fs.readFileSync(filePath, "utf8");
  return new Set(
    [
      ...source.matchAll(/\bapp\.(get|post|patch|delete|put)\(\s*"([^"]+)"/gs),
    ].map(
      ([, method, route]) =>
        `${method.toUpperCase()} ${joinPath(pathPrefix, route)}`,
    ),
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

function extractBrowserRoutes(appFile, operationsFile, pathPrefix) {
  const base = extractRoutes(appFile, pathPrefix);
  for (const op of extractRenderOperations(operationsFile)) {
    base.add(`POST ${joinPath(pathPrefix, `/v1/${op}`)}`);
  }
  base.delete(`GET ${joinPath(pathPrefix, "/health")}`);
  return base;
}

function verifyManifest(label, actualRoutes, expectedRoutes) {
  const missingRoutes = [...actualRoutes]
    .filter((route) => !expectedRoutes.has(route))
    .sort();
  const staleRoutes = [...expectedRoutes]
    .filter((route) => !actualRoutes.has(route))
    .sort();

  assert.equal(
    missingRoutes.length,
    0,
    `${label} SDK is missing public routes from voyant-cloud:\n${missingRoutes.join("\n")}`,
  );

  assert.equal(
    staleRoutes.length,
    0,
    `${label} SDK parity manifest contains routes no longer present in voyant-cloud:\n${staleRoutes.join("\n")}`,
  );
}

const requiredFiles = [
  manifestFile,
  vaultRoutesFile,
  cloudControlPlaneRoutesFile,
  smsRoutesFile,
  emailRoutesFile,
  verifyRoutesFile,
  videoRoutesFile,
  browserAppFile,
  browserOperationsFile,
];

if (!requiredFiles.every(fileExists)) {
  console.log(
    "Skipping API parity verification: sibling voyant-cloud route files not found.",
  );
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

const actualCloudRoutes = new Set([
  ...extractRoutes(vaultRoutesFile, "/vault/v1"),
  ...extractRoutes(cloudControlPlaneRoutesFile, "/cloud/v1"),
  ...extractRoutes(smsRoutesFile, "/sms/v1"),
  ...extractRoutes(emailRoutesFile, "/email/v1"),
  ...extractRoutes(verifyRoutesFile, "/verify/v1"),
  ...extractRoutes(videoRoutesFile, "/video/v1"),
  ...extractBrowserRoutes(browserAppFile, browserOperationsFile, "/browser"),
]);

// The realtime surface lives in the voyant-realtime-api worker. Until that
// worker lands in voyant-cloud, skip parity for /realtime/* only (instead
// of skipping the whole check) so every other product stays gated.
let expectedCloudRoutes = new Set(manifest.cloud);
if (fileExists(realtimeAppFile)) {
  for (const route of extractRoutes(realtimeAppFile, "/realtime")) {
    actualCloudRoutes.add(route);
  }
  actualCloudRoutes.delete("GET /realtime/health");
} else {
  expectedCloudRoutes = new Set(
    manifest.cloud.filter((route) => !route.includes(" /realtime/")),
  );
  console.log(
    "Skipping /realtime/* parity: apps/realtime-api/src/app.ts not found in voyant-cloud.",
  );
}

verifyManifest("Cloud", actualCloudRoutes, expectedCloudRoutes);

console.log("API parity verification passed for Cloud routes.");
