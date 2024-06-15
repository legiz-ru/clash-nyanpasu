import fs from "fs-extra";
import { MANIFEST_DIR, MANIFEST_VERSION_PATH } from "./utils/env";
import { consola } from "./utils/logger";
import { ManifestVersion, SupportedCore } from "./types/index";
import {
  resolveMihomo,
  resolveMihomoAlpha,
  resolveClashRs,
  resolveClashPremium,
} from "./utils/manifest";

if (!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN is required");
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const MANIFEST_VERSION = 1;

export async function generateLatestVersion() {
  const resolvers = [
    resolveMihomo,
    resolveMihomoAlpha,
    resolveClashRs,
    resolveClashPremium,
  ];

  consola.start("Resolving latest versions");

  const results = await Promise.all(resolvers.map((r) => r(GITHUB_TOKEN)));

  consola.success("Resolved latest versions");

  consola.start("Generating manifest");

  const manifest: ManifestVersion = {
    manifest_version: MANIFEST_VERSION,
    latest: {},
    arch_template: {},
  } as ManifestVersion;

  for (const result of results) {
    manifest.latest[result.name as SupportedCore] = result.version;
    manifest.arch_template[result.name as SupportedCore] = result.archMapping;
  }

  await fs.ensureDir(MANIFEST_DIR);
  // If no changes, skip writing manifest
  const previousManifest = (await fs.readJSON(MANIFEST_VERSION_PATH)) || {};

  delete previousManifest.updated_at;

  if (JSON.stringify(previousManifest) === JSON.stringify(manifest)) {
    consola.success("No changes, skip writing manifest");
    return;
  }

  manifest.updated_at = new Date().toISOString();

  consola.success("Generated manifest");

  await fs.writeJSON(MANIFEST_VERSION_PATH, manifest, { spaces: 2 });

  consola.success("Manifest written");
}

generateLatestVersion();
