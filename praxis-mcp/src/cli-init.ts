/**
 * Praxis MCP — CLI Init Command
 *
 * Scaffolds a new Praxis dev/ folder from the command line.
 * Usage: npx praxis-mcp init [options]
 *
 * This reuses the same scaffold logic as the MCP scaffold tool
 * but runs as a standalone CLI command instead of through MCP.
 */

import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFile, chmod } from "node:fs/promises";
import { ensureDir, fileExists, writeFileSafe, resolveDevPath } from "./lib/fs-helpers.js";
import { TIER_FOLDERS, CORE_DOCS } from "./lib/constants.js";
import { todayISO } from "./lib/naming.js";

// Template content (same as scaffold.ts)
const SOT_TEMPLATE = `# Source of Truth

Canonical reference for project decisions, standards, and facts.

## Workspace Rules

1. This workspace is **non-destructive** -- local copies only.
2. Every new project gets a fresh \`dev/\` folder.
3. No files at workspace root -- all output goes into project folders.
4. AI writes to \`draft/\` only. Admin promotes to \`published/\`.
5. Items move to \`executed/\` only when complete.
6. File naming: \`{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}\` -- Number 0 = READMEs.
7. Admin runs commands -- AI writes to \`dev/commands/active/\`.
8. Context docs updated every session end.

## Project-Specific

### Tech Stack

<!-- Fill in your tech stack -->

### Project Decisions

| # | Decision | Date | Rationale |
|---|----------|------|-----------|
`;

const CAPSULE_TEMPLATE = `# Context Capsule

Current working state for session continuity.

## Active Task

- **Task:** (none)
- **Status:** idle
- **Branch/Area:** --

## In-Progress Notes

(no active work)

## Last Session Summary

- **Date:** DATE_PLACEHOLDER
- **What was done:** Dev folder scaffolded via praxis-mcp init
- **What's next:** First work order
`;

const CHECKPOINT_TEMPLATE = `# Checkpoint

Progress milestones and completed phases.

## Milestones

| # | Milestone | Date | Status |
|---|-----------|------|--------|
| 1 | Dev folder scaffolded via praxis-mcp init | DATE_PLACEHOLDER | Done |

## Current Phase

**Phase:** Setup
**Description:** Dev folder initialized. Ready for first work order.
`;

interface InitOptions {
  path: string;
  tier: "starter" | "standard" | "full";
  mode: "solo" | "triangle";
  agents: string[];
}

function parseArgs(args: string[]): InitOptions {
  const options: InitOptions = {
    path: process.cwd(),
    tier: "starter",
    mode: "solo",
    agents: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--path" && next) {
      options.path = resolve(next);
      i++;
    } else if (arg === "--tier" && next) {
      if (["starter", "standard", "full"].includes(next)) {
        options.tier = next as "starter" | "standard" | "full";
      }
      i++;
    } else if (arg === "--mode" && next) {
      if (["solo", "triangle"].includes(next)) {
        options.mode = next as "solo" | "triangle";
      }
      i++;
    } else if (arg === "--agents" && next) {
      options.agents = next.split(",").map(a => a.trim()).filter(Boolean);
      i++;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  // Default agents for triangle mode
  if (options.mode === "triangle" && options.agents.length === 0) {
    options.agents = ["claude", "codex", "gemini"];
  }

  return options;
}

function printHelp(): void {
  console.log(`
praxis-mcp init — Scaffold a Praxis dev/ folder

Usage:
  npx praxis-mcp init [options]

Options:
  --path <dir>      Project root (default: current directory)
  --tier <tier>     starter | standard | full (default: starter)
  --mode <mode>     solo | triangle (default: solo)
  --agents <list>   Comma-separated agent names (default: claude,codex,gemini)
  --help, -h        Show this help

Examples:
  npx praxis-mcp init
  npx praxis-mcp init --tier full --mode triangle
  npx praxis-mcp init --path ./my-project --tier standard
`);
}

export async function runInit(args: string[]): Promise<void> {
  const options = parseArgs(args);
  const dev = resolveDevPath(options.path);
  const today = todayISO();

  console.log(`\nPraxis Init — scaffolding ${options.tier} tier (${options.mode} mode)`);
  console.log(`Target: ${options.path}\n`);

  const created: string[] = [];

  // Create dev/ root
  if (await ensureDir(dev)) created.push("dev/");

  // Create tier-specific folders
  const folders = TIER_FOLDERS[options.tier] ?? TIER_FOLDERS.starter;
  for (const folder of folders) {
    const mappedFolder = folder === "work-orders/executed" ? "work-orders/_executed" : folder;
    if (await ensureDir(join(dev, mappedFolder))) {
      created.push(`dev/${mappedFolder}/`);
    }
  }

  // Create triangle mode WO folders
  if (options.mode === "triangle" && options.agents.length > 0) {
    for (const agent of options.agents) {
      const woDir = join(dev, "work-orders", `wo_${agent}`);
      const executedDir = join(woDir, "_executed");
      if (await ensureDir(woDir)) created.push(`dev/work-orders/wo_${agent}/`);
      if (await ensureDir(executedDir)) created.push(`dev/work-orders/wo_${agent}/_executed/`);
    }
  }

  // Create init/ folder
  if (await ensureDir(join(dev, "init"))) created.push("dev/init/");

  // Create core context documents
  const sotPath = join(dev, "source_of_truth.md");
  if (!(await fileExists(sotPath))) {
    await writeFileSafe(sotPath, SOT_TEMPLATE);
    created.push("dev/source_of_truth.md");
  }

  const capsulePath = join(dev, "context_capsule.md");
  if (!(await fileExists(capsulePath))) {
    await writeFileSafe(capsulePath, CAPSULE_TEMPLATE.replace(/DATE_PLACEHOLDER/g, today));
    created.push("dev/context_capsule.md");
  }

  const checkpointPath = join(dev, "checkpoint.md");
  if (!(await fileExists(checkpointPath))) {
    await writeFileSafe(checkpointPath, CHECKPOINT_TEMPLATE.replace(/DATE_PLACEHOLDER/g, today));
    created.push("dev/checkpoint.md");
  }

  // Copy linter to .praxis/
  const praxisDir = join(options.path, ".praxis");
  const linterDest = join(praxisDir, "praxis-lint.sh");
  if (!(await fileExists(linterDest))) {
    // Resolve the bundled template path relative to this module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const templatePath = join(__dirname, "..", "templates", "praxis-lint.sh");

    if (await fileExists(templatePath)) {
      await ensureDir(praxisDir);
      await copyFile(templatePath, linterDest);
      await chmod(linterDest, 0o755);
      created.push(".praxis/praxis-lint.sh");
    }
  }

  // Summary
  if (created.length === 0) {
    console.log("Nothing to create — Praxis structure already exists.");
  } else {
    console.log(`Created ${created.length} items:`);
    for (const item of created) {
      console.log(`  + ${item}`);
    }
  }

  console.log("\nPraxis scaffold complete. Run your first session_start to begin.");
}
