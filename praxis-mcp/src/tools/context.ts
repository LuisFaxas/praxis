/**
 * Praxis MCP — Context Chain Tools
 *
 * read_context: Read one or all context documents with metadata
 * update_capsule: Patch context_capsule.md with structured fields
 * update_checkpoint: Append a milestone to checkpoint.md
 */

import { z } from "zod";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSafe, writeFileSafe, getFileAgeDays, getFileSize, resolveDevPath } from "../lib/fs-helpers.js";
import { parseCapsule, parseCheckpoint, parseSOT } from "../lib/parsers.js";
import { todayISO } from "../lib/naming.js";

function getProjectPath(override?: string): string {
  return override || process.env.PRAXIS_PROJECT_DIR || process.cwd();
}

export function registerContextTools(server: McpServer): void {

  // ─── read_context ────────────────────────────────

  server.tool(
    "read_context",
    "Read one or all Praxis context documents (Source of Truth, Context Capsule, Checkpoint) with metadata including file size, age in days, and key parsed fields.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      document: z.enum(["source_of_truth", "context_capsule", "checkpoint", "all"]).optional().default("all").describe("Which document to read."),
    },
    async ({ project_path, document }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);

      const docs: Record<string, unknown> = {};

      const shouldRead = (name: string) => document === "all" || document === name;

      if (shouldRead("source_of_truth")) {
        const path = join(dev, "source_of_truth.md");
        const content = await readFileSafe(path);
        const [age, size] = await Promise.all([getFileAgeDays(path), getFileSize(path)]);
        const parsed = content ? parseSOT(content) : null;
        docs.sourceOfTruth = {
          exists: content !== null,
          content: content ?? null,
          ageDays: age,
          sizeBytes: size,
          decisionsCount: parsed?.decisionsCount ?? 0,
          referencedPaths: parsed?.referencedPaths ?? [],
        };
      }

      if (shouldRead("context_capsule")) {
        const path = join(dev, "context_capsule.md");
        const content = await readFileSafe(path);
        const [age, size] = await Promise.all([getFileAgeDays(path), getFileSize(path)]);
        const parsed = content ? parseCapsule(content) : null;
        docs.contextCapsule = {
          exists: content !== null,
          content: content ?? null,
          ageDays: age,
          sizeBytes: size,
          activeTask: parsed?.activeTask ?? null,
          status: parsed?.status ?? null,
          lastSessionDate: parsed?.lastSession.date ?? null,
        };
      }

      if (shouldRead("checkpoint")) {
        const path = join(dev, "checkpoint.md");
        const content = await readFileSafe(path);
        const [age, size] = await Promise.all([getFileAgeDays(path), getFileSize(path)]);
        const parsed = content ? parseCheckpoint(content) : null;
        docs.checkpoint = {
          exists: content !== null,
          content: content ?? null,
          ageDays: age,
          sizeBytes: size,
          milestonesCount: parsed?.milestones.length ?? 0,
          currentPhase: parsed?.currentPhase ?? null,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(docs, null, 2),
        }],
      };
    }
  );

  // ─── update_capsule ──────────────────────────────

  server.tool(
    "update_capsule",
    "Update the Praxis Context Capsule with session state. Replaces specified sections while preserving others. The capsule is the live handoff document updated at the end of every session.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      active_task: z.string().optional().describe("Current task description."),
      task_status: z.enum(["idle", "in-progress", "blocked", "complete"]).optional().describe("Current task status."),
      branch_or_area: z.string().optional().describe("Current branch or working area."),
      in_progress_notes: z.string().optional().describe("Bullet-point notes about in-progress work."),
      session_summary: z.string().optional().describe("What was accomplished this session."),
      next_steps: z.string().optional().describe("What should be done next session."),
    },
    async ({ project_path, active_task, task_status, branch_or_area, in_progress_notes, session_summary, next_steps }) => {
      const projectPath = getProjectPath(project_path);
      const capsulePath = join(resolveDevPath(projectPath), "context_capsule.md");

      let content = await readFileSafe(capsulePath);
      if (content === null) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Context capsule not found at ${capsulePath}. Run the scaffold tool to initialize Praxis.`,
          }],
        };
      }

      // Update Active Task section
      if (active_task !== undefined || task_status !== undefined || branch_or_area !== undefined) {
        const taskLine = active_task !== undefined
          ? `- **Task:** ${active_task}`
          : content.match(/- \*\*Task:\*\* .+/)?.[0] ?? "- **Task:** (none)";

        const statusLine = task_status !== undefined
          ? `- **Status:** ${task_status}`
          : content.match(/- \*\*Status:\*\* .+/)?.[0] ?? "- **Status:** idle";

        const branchLine = branch_or_area !== undefined
          ? `- **Branch/Area:** ${branch_or_area}`
          : content.match(/- \*\*Branch\/Area:\*\* .+/)?.[0] ?? "- **Branch/Area:** --";

        const newActiveTask = `## Active Task\n\n${taskLine}\n${statusLine}\n${branchLine}`;

        content = content.replace(
          /## Active Task\s*\n[\s\S]*?(?=\n## )/,
          newActiveTask + "\n\n"
        );
      }

      // Update In-Progress Notes section
      if (in_progress_notes !== undefined) {
        const newNotes = `## In-Progress Notes\n\n${in_progress_notes}`;
        content = content.replace(
          /## In-Progress Notes\s*\n[\s\S]*?(?=\n## )/,
          newNotes + "\n\n"
        );
      }

      // Update Last Session Summary section
      if (session_summary !== undefined || next_steps !== undefined) {
        const date = todayISO();
        const doneLine = session_summary !== undefined
          ? `- **What was done:** ${session_summary}`
          : content.match(/- \*\*What was done:\*\* .+/)?.[0] ?? "- **What was done:** (no summary)";

        const nextLine = next_steps !== undefined
          ? `- **What's next:** ${next_steps}`
          : content.match(/- \*\*What's next:\*\* .+/)?.[0] ?? "- **What's next:** (no next steps)";

        const newSummary = `## Last Session Summary\n\n- **Date:** ${date}\n${doneLine}\n${nextLine}`;

        // Handle both mid-file and end-of-file positions
        if (content.includes("## Last Session Summary")) {
          content = content.replace(
            /## Last Session Summary\s*\n[\s\S]*$/,
            newSummary + "\n"
          );
        } else {
          content = content.trimEnd() + "\n\n" + newSummary + "\n";
        }
      }

      await writeFileSafe(capsulePath, content);

      return {
        content: [{
          type: "text" as const,
          text: "Context capsule updated successfully.",
        }],
      };
    }
  );

  // ─── update_checkpoint ───────────────────────────

  server.tool(
    "update_checkpoint",
    "Add a milestone entry to the Praxis Checkpoint document. Auto-assigns the next sequential number and formats the table row. Also updates the Current Phase section if provided.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      milestone: z.string().describe("Description of the milestone achieved."),
      status: z.enum(["Done", "In Progress", "Blocked"]).optional().default("Done").describe("Milestone status."),
      date: z.string().optional().describe("Date in YYYY-MM-DD format. Defaults to today."),
      current_phase: z.string().optional().describe("Update the Current Phase name (e.g., '3 -- API Development')."),
      phase_description: z.string().optional().describe("Update the Current Phase description."),
    },
    async ({ project_path, milestone, status, date, current_phase, phase_description }) => {
      const projectPath = getProjectPath(project_path);
      const checkpointPath = join(resolveDevPath(projectPath), "checkpoint.md");

      let content = await readFileSafe(checkpointPath);
      if (content === null) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Checkpoint not found at ${checkpointPath}. Run the scaffold tool to initialize Praxis.`,
          }],
        };
      }

      const parsed = parseCheckpoint(content);
      const nextNum = parsed.milestones.length > 0
        ? Math.max(...parsed.milestones.map(m => m.number)) + 1
        : 1;

      const milestoneDate = date ?? todayISO();
      const newRow = `| ${nextNum} | ${milestone} | ${milestoneDate} | ${status} |`;

      // Insert new row after the last table row (before any blank line after the table)
      const tableEndRegex = /(\|[^\n]+\|)\s*\n(\s*\n)/;
      const tableMatch = content.match(tableEndRegex);
      if (tableMatch) {
        // Find the last table row and append after it
        const lines = content.split("\n");
        let lastTableRowIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].startsWith("|") && !lines[i].includes("---") && !lines[i].includes("Milestone")) {
            lastTableRowIndex = i;
            break;
          }
        }
        if (lastTableRowIndex >= 0) {
          lines.splice(lastTableRowIndex + 1, 0, newRow);
          content = lines.join("\n");
        }
      } else {
        // Fallback: append after the separator line
        content = content.replace(
          /(\|---\|---.*\|)\n/,
          `$1\n${newRow}\n`
        );
      }

      // Update Current Phase if provided
      if (current_phase !== undefined) {
        content = content.replace(
          /\*\*Phase:\*\*.+/,
          `**Phase:** ${current_phase}`
        );
      }
      if (phase_description !== undefined) {
        content = content.replace(
          /\*\*Description:\*\*.+/,
          `**Description:** ${phase_description}`
        );
      }

      await writeFileSafe(checkpointPath, content);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: "Checkpoint updated successfully.",
            milestoneNumber: nextNum,
            milestone,
            date: milestoneDate,
            status,
          }, null, 2),
        }],
      };
    }
  );
}
