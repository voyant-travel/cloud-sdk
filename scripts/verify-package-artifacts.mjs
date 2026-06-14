import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-pack-"));

const sdkCoreVersion = JSON.parse(
  readFileSync(
    path.join(repoRoot, "packages", "sdk-core", "package.json"),
    "utf8",
  ),
).version;

const packages = [
  {
    dir: path.join(repoRoot, "packages", "cloud-sdk"),
    expectedName: "@voyant-travel/cloud-sdk",
  },
];

function packPackage(packageDir) {
  const output = execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
    cwd: packageDir,
    encoding: "utf8",
  }).trim();

  return output.split("\n").at(-1);
}

function readPackedManifest(tarballPath) {
  const raw = execFileSync("tar", ["-xOf", tarballPath, "package/package.json"], {
    encoding: "utf8",
  });

  return JSON.parse(raw);
}

function readPackedFileList(tarballPath) {
  return execFileSync("tar", ["-tzf", tarballPath], {
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function installPackedPackage(appDir, tarballPath, packageName) {
  const [scope, name] = packageName.split("/");
  const scopeDir = path.join(appDir, "node_modules", scope);
  const packageDir = path.join(scopeDir, name);
  const extractDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-unpack-"));

  mkdirSync(scopeDir, { recursive: true });
  execFileSync("tar", ["-xzf", tarballPath, "-C", extractDir], { encoding: "utf8" });
  renameSync(path.join(extractDir, "package"), packageDir);
  rmSync(extractDir, { force: true, recursive: true });
}

function verifyInstalledImports(tarballs) {
  const appDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-app-"));

  try {
    mkdirSync(path.join(appDir, "node_modules"), { recursive: true });
    writeFileSync(
      path.join(appDir, "package.json"),
      JSON.stringify(
        {
          name: "voyant-sdk-artifact-test",
          private: true,
          type: "module",
        },
        null,
        2,
      ),
    );

    for (const [packageName, tarballPath] of tarballs) {
      installPackedPackage(appDir, tarballPath, packageName);
    }

    execFileSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `
          import assert from "node:assert/strict";
          import { createVoyantCloudClient } from "@voyant-travel/cloud-sdk";

          const cloud = createVoyantCloudClient({ apiKey: "cloud_key" });

          assert.equal(typeof cloud.vault.listVaults, "function");
          assert.equal(typeof cloud.vault.listSecrets, "function");
          assert.equal(typeof cloud.vault.getSecret, "function");
          assert.equal(typeof cloud.sms.listPhoneNumbers, "function");
          assert.equal(typeof cloud.sms.listMessages, "function");
          assert.equal(typeof cloud.sms.sendMessage, "function");
          assert.equal(typeof cloud.verification.start, "function");
          assert.equal(typeof cloud.verification.check, "function");
          assert.equal(typeof cloud.verification.listAttempts, "function");
          assert.equal(typeof cloud.email.listMessages, "function");
          assert.equal(typeof cloud.email.sendMessage, "function");
          assert.equal(typeof cloud.email.getMessage, "function");
        `,
      ],
      {
        cwd: appDir,
        encoding: "utf8",
      },
    );
  } finally {
    rmSync(appDir, { force: true, recursive: true });
  }
}

function verifyInstalledTypecheck(tarballs) {
  const appDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-types-"));

  try {
    mkdirSync(path.join(appDir, "node_modules"), { recursive: true });
    writeFileSync(
      path.join(appDir, "package.json"),
      JSON.stringify(
        {
          name: "voyant-sdk-types-test",
          private: true,
          type: "module",
        },
        null,
        2,
      ),
    );

    for (const [packageName, tarballPath] of tarballs) {
      installPackedPackage(appDir, tarballPath, packageName);
    }

    writeFileSync(
      path.join(appDir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            module: "NodeNext",
            moduleResolution: "NodeNext",
            noEmit: true,
            strict: true,
            target: "ES2022",
          },
          include: ["index.ts"],
        },
        null,
        2,
      ),
    );

    writeFileSync(
      path.join(appDir, "index.ts"),
      `
        import {
          createVoyantCloudClient,
          VoyantCloudClient,
          type CheckVerificationInput,
          type EmailMessageStatus,
          type EmailMessageSummary,
          type PhoneNumberCapabilities,
          type PhoneNumberStatus,
          type PhoneNumberSummary,
          type SendEmailInput,
          type SendSmsInput,
          type SmsMessageStatus,
          type SmsMessageSummary,
          type StartVerificationInput,
          type VaultSecretSummary,
          type VaultSecretValue,
          type VaultSummary,
          type VerificationAttemptStatus,
          type VerificationAttemptSummary,
          type VerificationChannel,
          type VerificationCheckResult,
          type VoyantCloudClientOptions,
        } from "@voyant-travel/cloud-sdk";

        const cloud: VoyantCloudClient = createVoyantCloudClient({
          apiKey: "cloud_key",
        } satisfies VoyantCloudClientOptions);

        const vaultsPromise: Promise<VaultSummary[]> = cloud.vault.listVaults();
        const secretsPromise: Promise<VaultSecretSummary[]> =
          cloud.vault.listSecrets("primary");
        const secretPromise: Promise<VaultSecretValue> = cloud.vault.getSecret(
          "primary",
          "stripe-key",
        );
        const phoneNumbersPromise: Promise<PhoneNumberSummary[]> =
          cloud.sms.listPhoneNumbers();
        const messagesPromise: Promise<SmsMessageSummary[]> =
          cloud.sms.listMessages();

        const sendInput: SendSmsInput = {
          to: "+14155551234",
          body: "Hello from Voyant Cloud",
        };
        const sendPromise: Promise<SmsMessageSummary> =
          cloud.sms.sendMessage(sendInput);

        const startInput: StartVerificationInput = {
          to: "+14155551234",
          channel: "sms" satisfies VerificationChannel,
        };
        const startPromise: Promise<VerificationAttemptSummary> =
          cloud.verification.start(startInput);
        const checkInput: CheckVerificationInput = {
          to: "+14155551234",
          code: "123456",
        };
        const checkPromise: Promise<VerificationCheckResult> =
          cloud.verification.check(checkInput);
        const attemptsPromise: Promise<VerificationAttemptSummary[]> =
          cloud.verification.listAttempts();

        const emailListPromise: Promise<EmailMessageSummary[]> =
          cloud.email.listMessages();
        const emailSendInput: SendEmailInput = {
          from: "noreply@example.com",
          to: ["alice@example.com"],
          subject: "Welcome",
          text: "Hi",
        };
        const emailSendPromise: Promise<EmailMessageSummary> =
          cloud.email.sendMessage(emailSendInput);
        const emailGetPromise: Promise<EmailMessageSummary> =
          cloud.email.getMessage("email_123");

        const phoneStatus: PhoneNumberStatus = "active";
        const messageStatus: SmsMessageStatus = "queued";
        const attemptStatus: VerificationAttemptStatus = "pending";
        const emailStatus: EmailMessageStatus = "delivered";
        const capabilities: PhoneNumberCapabilities = { sms: true };

        void vaultsPromise;
        void secretsPromise;
        void secretPromise;
        void phoneNumbersPromise;
        void messagesPromise;
        void sendPromise;
        void startPromise;
        void checkPromise;
        void attemptsPromise;
        void emailListPromise;
        void emailSendPromise;
        void emailGetPromise;
        void phoneStatus;
        void messageStatus;
        void attemptStatus;
        void emailStatus;
        void capabilities;
      `,
    );

    execFileSync(
      process.execPath,
      [path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"), "-p", appDir],
      {
        cwd: appDir,
        encoding: "utf8",
      },
    );
  } finally {
    rmSync(appDir, { force: true, recursive: true });
  }
}

try {
  const tarballs = new Map();

  for (const pkg of packages) {
    const tarballPath = packPackage(pkg.dir);
    const manifest = readPackedManifest(tarballPath);
    const files = readPackedFileList(tarballPath);
    tarballs.set(pkg.expectedName, tarballPath);

    assert.equal(manifest.name, pkg.expectedName);
    assert.equal(manifest.main, "./dist/index.js");
    assert.equal(manifest.types, "./dist/index.d.ts");
    assert.equal(manifest.publishConfig?.access, "public");
    assert.equal(manifest.exports?.["."].import, "./dist/index.js");
    assert.equal(manifest.exports?.["."].types, "./dist/index.d.ts");

    assert.deepEqual(manifest.bundleDependencies, ["@voyant-travel/sdk-core"]);
    assert.equal(manifest.dependencies?.["@voyant-travel/sdk-core"], sdkCoreVersion);

    assert.ok(files.includes("package/README.md"));
    assert.ok(files.includes("package/package.json"));
    assert.ok(files.includes("package/dist/index.js"));
    assert.ok(files.includes("package/dist/index.d.ts"));
    assert.ok(files.includes("package/node_modules/@voyant-travel/sdk-core/package.json"));
    assert.ok(files.includes("package/node_modules/@voyant-travel/sdk-core/dist/index.js"));
    assert.ok(files.includes("package/node_modules/@voyant-travel/sdk-core/dist/index.d.ts"));

    const hasSrcFiles = files.some((file) => file.startsWith("package/src/"));
    assert.equal(hasSrcFiles, false);
  }

  verifyInstalledImports(tarballs);
  verifyInstalledTypecheck(tarballs);

  console.log("Package artifact verification passed.");
} finally {
  rmSync(packDir, { force: true, recursive: true });
}
