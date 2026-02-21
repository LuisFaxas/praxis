/**
 * Praxis MCP — Scaffold Tool
 *
 * scaffold: Create missing Praxis dev/ directories and template files
 */

import { z } from "zod";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ensureDir, fileExists, writeFileSafe, resolveDevPath } from "../lib/fs-helpers.js";
import { TIER_FOLDERS, CORE_DOCS } from "../lib/constants.js";
import { todayISO } from "../lib/naming.js";

function getProjectPath(override?: string): string {
  return override || process.env.PRAXIS_PROJECT_DIR || process.cwd();
}

// Template content for core context documents
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
- **What was done:** Dev folder scaffolded via Praxis MCP
- **What's next:** First work order
`;

const CHECKPOINT_TEMPLATE = `# Checkpoint

Progress milestones and completed phases.

## Milestones

| # | Milestone | Date | Status |
|---|-----------|------|--------|
| 1 | Dev folder scaffolded via Praxis MCP | DATE_PLACEHOLDER | Done |

## Current Phase

**Phase:** Setup
**Description:** Dev folder initialized. Ready for first work order.
`;

export function registerScaffoldTool(server: McpServer): void {

  server.tool(
    "scaffold",
    "Create the Praxis dev/ folder structure for a project. Detects the target tier and creates all required directories and template context documents. Safe to run multiple times — never overwrites existing files.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      tier: z.enum(["starter", "standard", "full"]).optional().default("starter").describe("Adoption tier determines which folders are created."),
      mode: z.enum(["solo", "triangle"]).optional().default("solo").describe("Operational mode."),
      agents: z.array(z.string()).optional().describe("Agent names for triangle mode WO folders (e.g., ['claude', 'codex', 'gemini'])."),
    },
    async ({ project_path, tier, mode, agents }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);
      const today = todayISO();

      const created: string[] = [];
      const alreadyExisted: string[] = [];

      // Create dev/ root
      const devCreated = await ensureDir(dev);
      (devCreated ? created : alreadyExisted).push("dev/");

      // Create tier-specific folders
      const folders = TIER_FOLDERS[tier] ?? TIER_FOLDERS.starter;
      for (const folder of folders) {
        const fullPath = join(dev, folder);
        const wasCreated = await ensureDir(fullPath);
        const label = `dev/${folder}/`;
        (wasCreated ? created : alreadyExisted).push(label);
      }

      // Create triangle mode WO folders
      if (mode === "triangle" && agents && agents.length > 0) {
        for (const agent of agents) {
          const woDir = join(dev, "work-orders", `wo_${agent}`);
          const executedDir = join(woDir, "executed");
          const woCreated = await ensureDir(woDir);
          const execCreated = await ensureDir(executedDir);
          (woCreated ? created : alreadyExisted).push(`dev/work-orders/wo_${agent}/`);
          (execCreated ? created : alreadyExisted).push(`dev/work-orders/wo_${agent}/executed/`);
        }
      }

      // Create init/ folder
      const initCreated = await ensureDir(join(dev, "init"));
      (initCreated ? created : alreadyExisted).push("dev/init/");

      // Create core context documents (only if they don't exist)
      const docsCreated: string[] = [];

      const sotPath = join(dev, "source_of_truth.md");
      if (!(await fileExists(sotPath))) {
        await writeFileSafe(sotPath, SOT_TEMPLATE);
        docsCreated.push("source_of_truth.md");
      }

      const capsulePath = join(dev, "context_capsule.md");
      if (!(await fileExists(capsulePath))) {
        await writeFileSafe(capsulePath, CAPSULE_TEMPLATE.replace(/DATE_PLACEHOLDER/g, today));
        docsCreated.push("context_capsule.md");
      }

      const checkpointPath = join(dev, "checkpoint.md");
      if (!(await fileExists(checkpointPath))) {
        await writeFileSafe(checkpointPath, CHECKPOINT_TEMPLATE.replace(/DATE_PLACEHOLDER/g, today));
        docsCreated.push("checkpoint.md");
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: "Praxis scaffold complete.",
            tier,
            mode,
            directoriesCreated: created,
            directoriesExisted: alreadyExisted,
            contextDocsCreated: docsCreated,
            contextDocsExisted: CORE_DOCS.filter(d => !docsCreated.includes(d)),
          }, null, 2),
        }],
      };
    }
  );
}
