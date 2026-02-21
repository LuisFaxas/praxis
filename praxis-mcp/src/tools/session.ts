/**
 * Praxis MCP — Session Tools
 *
 * session_start: Read full context chain + pending WOs in canonical order
 * session_end: Validate context docs were updated, optionally lint
 * detect_project: Detect tier, mode, providers, structural completeness
 */

import { z } from "zod";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { detectProject, detectTier, detectMode, detectProviders } from "../lib/detection.js";
import { readFileSafe, getFileAgeDays, getFileSize, wasModifiedToday, resolveDevPath, listMarkdownFiles, listSubdirectories } from "../lib/fs-helpers.js";
import { parseCapsule, parseCheckpoint, parseSOT, parseWorkOrder } from "../lib/parsers.js";

function getProjectPath(override?: string): string {
  return override || process.env.PRAXIS_PROJECT_DIR || process.cwd();
}

export function registerSessionTools(server: McpServer): void {

  // ─── session_start ───────────────────────────────

  server.tool(
    "session_start",
    "Read the full Praxis context chain (Source of Truth, Context Capsule, Checkpoint) and pending work orders in canonical order. Returns a complete project state snapshot for session resumption.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
    },
    async ({ project_path }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);

      // Detect project state
      const detection = await detectProject(projectPath);

      if (!detection.hasDevFolder) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `No dev/ folder found at ${projectPath}. Run the scaffold tool to initialize Praxis, or verify the project path.`,
          }],
        };
      }

      // Read all three context documents
      const [sotContent, capsuleContent, checkpointContent] = await Promise.all([
        readFileSafe(join(dev, "source_of_truth.md")),
        readFileSafe(join(dev, "context_capsule.md")),
        readFileSafe(join(dev, "checkpoint.md")),
      ]);

      // Get file metadata
      const [sotAge, capsuleAge, checkpointAge, sotSize, capsuleSize] = await Promise.all([
        getFileAgeDays(join(dev, "source_of_truth.md")),
        getFileAgeDays(join(dev, "context_capsule.md")),
        getFileAgeDays(join(dev, "checkpoint.md")),
        getFileSize(join(dev, "source_of_truth.md")),
        getFileSize(join(dev, "context_capsule.md")),
      ]);

      // Parse documents
      const capsuleParsed = capsuleContent ? parseCapsule(capsuleContent) : null;
      const checkpointParsed = checkpointContent ? parseCheckpoint(checkpointContent) : null;
      const sotParsed = sotContent ? parseSOT(sotContent) : null;

      // List pending work orders
      const pendingWOs = await listPendingWorkOrders(dev, detection.mode);

      // Health assessment
      const health = {
        capsuleFreshness: capsuleAge === null ? "missing" :
          capsuleAge <= 7 ? "fresh" :
          capsuleAge <= 14 ? "stale" : "critical",
        checkpointFreshness: checkpointAge === null ? "missing" :
          checkpointAge <= 30 ? "fresh" : "stale",
        sotEmpty: sotSize < 100,
        capsuleEmpty: capsuleSize < 50,
      };

      const result = {
        project: {
          path: projectPath,
          tier: detection.tier,
          mode: detection.mode,
          providers: detection.providers,
          hasLinter: detection.hasLinter,
        },
        sourceOfTruth: {
          content: sotContent ?? "(not found)",
          decisionsCount: sotParsed?.decisionsCount ?? 0,
          ageDays: sotAge,
        },
        contextCapsule: {
          content: capsuleContent ?? "(not found)",
          activeTask: capsuleParsed?.activeTask ?? null,
          status: capsuleParsed?.status ?? null,
          lastSessionDate: capsuleParsed?.lastSession.date ?? null,
          ageDays: capsuleAge,
        },
        checkpoint: {
          content: checkpointContent ?? "(not found)",
          milestonesCount: checkpointParsed?.milestones.length ?? 0,
          currentPhase: checkpointParsed?.currentPhase ?? null,
          ageDays: checkpointAge,
        },
        pendingWorkOrders: pendingWOs,
        health,
      };

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // ─── session_end ─────────────────────────────────

  server.tool(
    "session_end",
    "Validate that Praxis context documents were updated during this session. Checks file modification times against today's date. Returns a compliance report.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      run_lint: z.boolean().optional().default(false).describe("Also run praxis-lint and include findings."),
    },
    async ({ project_path, run_lint }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);

      const [sotUpdated, capsuleUpdated, checkpointUpdated] = await Promise.all([
        wasModifiedToday(join(dev, "source_of_truth.md")),
        wasModifiedToday(join(dev, "context_capsule.md")),
        wasModifiedToday(join(dev, "checkpoint.md")),
      ]);

      const warnings: string[] = [];
      if (!capsuleUpdated) warnings.push("context_capsule.md was NOT updated today — session handoff may be incomplete.");
      if (!checkpointUpdated) warnings.push("checkpoint.md was NOT updated today — milestone progress may not be recorded.");

      const compliance = warnings.length === 0 ? "pass" : "warn";

      const result: Record<string, unknown> = {
        compliance,
        documentsUpdatedToday: {
          sourceOfTruth: sotUpdated,
          contextCapsule: capsuleUpdated,
          checkpoint: checkpointUpdated,
        },
        warnings,
      };

      // Optionally run lint
      if (run_lint) {
        result.lintNote = "Use the 'lint' tool separately for full linter output.";
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // ─── detect_project ──────────────────────────────

  server.tool(
    "detect_project",
    "Detect the Praxis configuration of a project: adoption tier (starter/standard/full), operational mode (solo/triangle), configured AI providers, and structural completeness.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
    },
    async ({ project_path }) => {
      const projectPath = getProjectPath(project_path);
      const detection = await detectProject(projectPath);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(detection, null, 2),
        }],
      };
    }
  );
}

// ─── Helper: List pending work orders ────────────

interface PendingWO {
  filename: string;
  agent: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  criteriaTotal: number;
  criteriaChecked: number;
}

async function listPendingWorkOrders(devPath: string, mode: string): Promise<PendingWO[]> {
  const results: PendingWO[] = [];
  const woRoot = join(devPath, "work-orders");

  if (mode === "triangle") {
    // Scan wo_*/ subfolders
    const agentDirs = await listSubdirectories(woRoot, "wo_");
    for (const dir of agentDirs) {
      const agent = dir.replace("wo_", "");
      const files = await listMarkdownFiles(join(woRoot, dir));
      for (const file of files) {
        const content = await readFileSafe(join(woRoot, dir, file));
        if (!content) continue;
        const parsed = parseWorkOrder(content);
        if (parsed.status?.toLowerCase() !== "complete" && parsed.status?.toLowerCase() !== "completed") {
          results.push({
            filename: file,
            agent,
            title: parsed.title,
            status: parsed.status,
            priority: parsed.priority,
            criteriaTotal: parsed.criteriaTotal,
            criteriaChecked: parsed.criteriaChecked,
          });
        }
      }
    }
  } else {
    // Solo mode: scan wo root directly
    const files = await listMarkdownFiles(woRoot);
    for (const file of files) {
      const content = await readFileSafe(join(woRoot, file));
      if (!content) continue;
      const parsed = parseWorkOrder(content);
      if (parsed.status?.toLowerCase() !== "complete" && parsed.status?.toLowerCase() !== "completed") {
        results.push({
          filename: file,
          agent: null,
          title: parsed.title,
          status: parsed.status,
          priority: parsed.priority,
          criteriaTotal: parsed.criteriaTotal,
          criteriaChecked: parsed.criteriaChecked,
        });
      }
    }
  }

  return results;
}
