/**
 * Praxis MCP — Project Detection
 *
 * Detects adoption tier, operational mode, and configured providers.
 * Ports the detection logic from praxis-lint.sh (lines 212-245) to TypeScript.
 */

import { join, basename } from "node:path";
import { readdir } from "node:fs/promises";
import { isDirectory, fileExists, resolveDevPath } from "./fs-helpers.js";
import { PRAXIS_INIT_FILENAME, INIT_FILE_SUFFIX } from "./constants.js";

export type Tier = "starter" | "standard" | "full" | "none";
export type Mode = "solo" | "triangle";

export interface ProjectDetection {
  hasDevFolder: boolean;
  tier: Tier;
  mode: Mode;
  providers: string[];
  coreDocs: {
    sourceOfTruth: boolean;
    contextCapsule: boolean;
    checkpoint: boolean;
  };
  hasLinter: boolean;
}

/**
 * Detect the project's adoption tier based on which folders exist.
 * Matches praxis-lint.sh detect_tier() exactly.
 */
export async function detectTier(projectPath: string): Promise<Tier> {
  const dev = resolveDevPath(projectPath);

  if (!(await isDirectory(dev))) return "none";

  const hasAudit = await isDirectory(join(dev, "audit"));
  const hasReports = await isDirectory(join(dev, "reports"));
  const hasDesign = await isDirectory(join(dev, "design"));
  const hasResearch = await isDirectory(join(dev, "research"));
  const hasPlanning = await isDirectory(join(dev, "planning"));

  if (hasAudit && hasReports && hasDesign) return "full";
  if (hasResearch && hasPlanning) return "standard";
  return "starter";
}

/**
 * Detect solo vs triangle mode by counting provider init files.
 * Matches praxis-lint.sh detect_triangle_mode() exactly.
 *
 * Logic: count *_INIT.md files in dev/init/, excluding PRAXIS_INIT.md.
 * 2+ provider init files = triangle mode.
 */
export async function detectMode(projectPath: string): Promise<Mode> {
  const initDir = join(resolveDevPath(projectPath), "init");

  if (!(await isDirectory(initDir))) return "solo";

  let providerCount = 0;
  try {
    const entries = await readdir(initDir);
    for (const entry of entries) {
      if (!entry.endsWith(INIT_FILE_SUFFIX)) continue;
      if (entry === PRAXIS_INIT_FILENAME) continue;
      providerCount++;
    }
  } catch {
    return "solo";
  }

  return providerCount >= 2 ? "triangle" : "solo";
}

/**
 * Detect which AI providers are configured by reading init file names.
 * Extracts the provider name from the filename pattern: {PROVIDER}_INIT.md
 */
export async function detectProviders(projectPath: string): Promise<string[]> {
  const initDir = join(resolveDevPath(projectPath), "init");

  if (!(await isDirectory(initDir))) return [];

  const providers: string[] = [];
  try {
    const entries = await readdir(initDir);
    for (const entry of entries) {
      if (!entry.endsWith(INIT_FILE_SUFFIX)) continue;
      if (entry === PRAXIS_INIT_FILENAME) continue;
      // Extract provider name: "CLAUDE_INIT.md" -> "claude"
      const name = entry.replace(INIT_FILE_SUFFIX, "").toLowerCase();
      providers.push(name);
    }
  } catch {
    // Return empty on error
  }

  return providers;
}

/**
 * Full project detection — combines tier, mode, providers, and core doc checks.
 */
export async function detectProject(projectPath: string): Promise<ProjectDetection> {
  const dev = resolveDevPath(projectPath);
  const hasDevFolder = await isDirectory(dev);

  if (!hasDevFolder) {
    return {
      hasDevFolder: false,
      tier: "none",
      mode: "solo",
      providers: [],
      coreDocs: { sourceOfTruth: false, contextCapsule: false, checkpoint: false },
      hasLinter: false,
    };
  }

  const [tier, mode, providers] = await Promise.all([
    detectTier(projectPath),
    detectMode(projectPath),
    detectProviders(projectPath),
  ]);

  const [sotExists, capsuleExists, checkpointExists, linterExists] = await Promise.all([
    fileExists(join(dev, "source_of_truth.md")),
    fileExists(join(dev, "context_capsule.md")),
    fileExists(join(dev, "checkpoint.md")),
    fileExists(join(projectPath, ".praxis", "praxis-lint.sh")),
  ]);

  return {
    hasDevFolder: true,
    tier,
    mode,
    providers,
    coreDocs: {
      sourceOfTruth: sotExists,
      contextCapsule: capsuleExists,
      checkpoint: checkpointExists,
    },
    hasLinter: linterExists,
  };
}
