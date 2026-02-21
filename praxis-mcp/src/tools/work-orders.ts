/**
 * Praxis MCP — Work Order Tools
 *
 * list_work_orders: List WOs with status/agent filters
 * read_work_order: Read and parse a specific WO
 * create_work_order: Create WO with naming convention enforcement
 * complete_work_order: Validate criteria then move to executed/
 */

import { z } from "zod";
import { join, basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { detectMode } from "../lib/detection.js";
import { readFileSafe, writeFileSafe, moveFile, resolveDevPath, listMarkdownFiles, listSubdirectories, fileExists, getFileAgeDays } from "../lib/fs-helpers.js";
import { parseWorkOrder } from "../lib/parsers.js";
import { nextWoNumber, formatFilename, todayISO, toUpperSnakeCase } from "../lib/naming.js";
import { WO_TEMPLATE } from "../lib/constants.js";

function getProjectPath(override?: string): string {
  return override || process.env.PRAXIS_PROJECT_DIR || process.cwd();
}

export function registerWorkOrderTools(server: McpServer): void {

  // ─── list_work_orders ────────────────────────────

  server.tool(
    "list_work_orders",
    "List all work orders in the Praxis queue. In solo mode, scans dev/work-orders/. In triangle mode, scans agent-specific subfolders (wo_claude/, wo_codex/, etc.). Returns parsed metadata for each WO.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      status: z.enum(["pending", "executed", "all"]).optional().default("pending").describe("Filter by status."),
      agent: z.string().optional().describe("Filter by agent name (e.g., 'claude'). Only applies in triangle mode."),
    },
    async ({ project_path, status, agent }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);
      const woRoot = join(dev, "work-orders");
      const mode = await detectMode(projectPath);

      interface WOEntry {
        filename: string;
        agent: string | null;
        location: "pending" | "executed";
        title: string | null;
        number: number | null;
        status: string | null;
        priority: string | null;
        assignedTo: string | null;
        criteriaTotal: number;
        criteriaChecked: number;
        ageDays: number | null;
      }

      const results: WOEntry[] = [];

      async function scanDir(dirPath: string, agentName: string | null, location: "pending" | "executed") {
        const files = await listMarkdownFiles(dirPath);
        for (const file of files) {
          const content = await readFileSafe(join(dirPath, file));
          if (!content) continue;
          const parsed = parseWorkOrder(content);
          const age = await getFileAgeDays(join(dirPath, file));
          results.push({
            filename: file,
            agent: agentName,
            location,
            title: parsed.title,
            number: parsed.number,
            status: parsed.status,
            priority: parsed.priority,
            assignedTo: parsed.assignedTo,
            criteriaTotal: parsed.criteriaTotal,
            criteriaChecked: parsed.criteriaChecked,
            ageDays: age,
          });
        }
      }

      if (mode === "triangle") {
        const agentDirs = await listSubdirectories(woRoot, "wo_");
        for (const dir of agentDirs) {
          const agentName = dir.replace("wo_", "");
          if (agent && agentName !== agent) continue;

          if (status === "pending" || status === "all") {
            await scanDir(join(woRoot, dir), agentName, "pending");
          }
          if (status === "executed" || status === "all") {
            await scanDir(join(woRoot, dir, "executed"), agentName, "executed");
          }
        }
      } else {
        // Solo mode
        if (status === "pending" || status === "all") {
          await scanDir(woRoot, null, "pending");
        }
        if (status === "executed" || status === "all") {
          await scanDir(join(woRoot, "executed"), null, "executed");
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            mode,
            count: results.length,
            workOrders: results,
          }, null, 2),
        }],
      };
    }
  );

  // ─── read_work_order ─────────────────────────────

  server.tool(
    "read_work_order",
    "Read and parse a specific Praxis work order by number or filename. Returns the full content plus structured metadata (status, priority, acceptance criteria with completion state).",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      identifier: z.string().describe("WO number (e.g., '3') or filename (e.g., '3_2026-02-20_TASK.md')."),
      agent: z.string().optional().describe("Agent folder to search in (triangle mode, e.g., 'claude')."),
    },
    async ({ project_path, identifier, agent }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);
      const woRoot = join(dev, "work-orders");
      const mode = await detectMode(projectPath);

      // Determine search directories
      const searchDirs: string[] = [];
      if (mode === "triangle" && agent) {
        searchDirs.push(join(woRoot, `wo_${agent}`));
        searchDirs.push(join(woRoot, `wo_${agent}`, "executed"));
      } else if (mode === "triangle") {
        const agentDirs = await listSubdirectories(woRoot, "wo_");
        for (const dir of agentDirs) {
          searchDirs.push(join(woRoot, dir));
          searchDirs.push(join(woRoot, dir, "executed"));
        }
      } else {
        searchDirs.push(woRoot);
        searchDirs.push(join(woRoot, "executed"));
      }

      // Search by exact filename or by number prefix
      const isNumeric = /^\d+$/.test(identifier);
      const searchPrefix = isNumeric ? `${identifier}_` : null;

      for (const dir of searchDirs) {
        const files = await listMarkdownFiles(dir, { includeExamples: true });
        for (const file of files) {
          if (file === identifier || (searchPrefix && file.startsWith(searchPrefix))) {
            const content = await readFileSafe(join(dir, file));
            if (!content) continue;
            const parsed = parseWorkOrder(content);
            const age = await getFileAgeDays(join(dir, file));

            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  filename: file,
                  path: join(dir, file),
                  ageDays: age,
                  ...parsed,
                  raw: undefined, // exclude raw from output (already have content)
                  content: content,
                }, null, 2),
              }],
            };
          }
        }
      }

      return {
        isError: true,
        content: [{
          type: "text" as const,
          text: `Work order "${identifier}" not found. Use list_work_orders to see available WOs.`,
        }],
      };
    }
  );

  // ─── create_work_order ───────────────────────────

  server.tool(
    "create_work_order",
    "Create a new Praxis work order with all required fields. Auto-assigns the next sequential number and formats the filename per Praxis naming convention ({number}_{YYYY-MM-DD}_{DESCRIPTION}.md).",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      title: z.string().describe("Short title for the work order (used in filename)."),
      description: z.string().describe("Detailed description of what needs to be done."),
      priority: z.enum(["Critical", "High", "Medium", "Low"]).optional().default("Medium").describe("Priority level."),
      assigned_to: z.string().optional().default("unassigned").describe("Agent name (e.g., 'Claude')."),
      acceptance_criteria: z.array(z.string()).min(1).describe("List of acceptance criteria (each becomes a checkbox)."),
      agent: z.string().optional().describe("Target agent folder for triangle mode (e.g., 'claude')."),
      batch: z.number().optional().describe("Batch number for grouping (0-3)."),
      notes: z.string().optional().describe("Additional notes."),
    },
    async ({ project_path, title, description, priority, assigned_to, acceptance_criteria, agent, batch, notes }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);
      const woRoot = join(dev, "work-orders");
      const mode = await detectMode(projectPath);

      // Determine target directory
      let targetDir: string;
      if (mode === "triangle" && agent) {
        targetDir = join(woRoot, `wo_${agent}`);
      } else {
        targetDir = woRoot;
      }

      // Get next number
      const existingFiles = await listMarkdownFiles(targetDir, { includeExamples: true });
      const number = nextWoNumber(existingFiles);

      // Format filename
      const date = todayISO();
      const filename = formatFilename(number, date, title);

      // Build WO content from template
      const criteriaLines = acceptance_criteria.map(c => `- [ ] ${c}`).join("\n");
      let content = WO_TEMPLATE
        .replace("{TITLE}", title)
        .replace("{NUMBER}", String(number))
        .replace("{DATE}", date)
        .replace("{ASSIGNED_TO}", assigned_to ?? "unassigned")
        .replace("{PRIORITY}", priority ?? "Medium")
        .replace("{DESCRIPTION}", description)
        .replace("{CRITERIA}", criteriaLines);

      // Add optional fields
      if (batch !== undefined) {
        content = content.replace(
          "## Description",
          `- **Batch:** ${batch}\n\n## Description`
        );
      }
      if (notes) {
        content = content.trimEnd() + "\n" + notes + "\n";
      }

      // Write the file
      const filePath = join(targetDir, filename);
      await writeFileSafe(filePath, content);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: "Work order created successfully.",
            filename,
            path: filePath,
            number,
            title,
            priority,
            assignedTo: assigned_to,
            criteriaCount: acceptance_criteria.length,
          }, null, 2),
        }],
      };
    }
  );

  // ─── complete_work_order ─────────────────────────

  server.tool(
    "complete_work_order",
    "Mark a work order as complete and move it to the executed/ folder. Validates that ALL acceptance criteria checkboxes are checked before allowing completion. This enforces the Praxis rule: items move to executed/ only when complete.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      identifier: z.string().describe("WO number (e.g., '3') or filename."),
      agent: z.string().optional().describe("Agent folder (triangle mode, e.g., 'claude')."),
      force: z.boolean().optional().default(false).describe("Complete even with unchecked criteria (not recommended)."),
    },
    async ({ project_path, identifier, agent, force }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);
      const woRoot = join(dev, "work-orders");
      const mode = await detectMode(projectPath);

      // Find the WO file
      let targetDir: string;
      if (mode === "triangle" && agent) {
        targetDir = join(woRoot, `wo_${agent}`);
      } else {
        targetDir = woRoot;
      }

      const isNumeric = /^\d+$/.test(identifier);
      const searchPrefix = isNumeric ? `${identifier}_` : null;

      const files = await listMarkdownFiles(targetDir, { includeExamples: true });
      let foundFile: string | null = null;

      for (const file of files) {
        if (file === identifier || (searchPrefix && file.startsWith(searchPrefix))) {
          foundFile = file;
          break;
        }
      }

      if (!foundFile) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Work order "${identifier}" not found in ${targetDir}. Use list_work_orders to see available WOs.`,
          }],
        };
      }

      const filePath = join(targetDir, foundFile);
      let content = await readFileSafe(filePath);
      if (!content) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Could not read work order at ${filePath}.`,
          }],
        };
      }

      const parsed = parseWorkOrder(content);

      // Validate all criteria are checked
      const unchecked = parsed.criteria.filter(c => !c.checked);
      if (unchecked.length > 0 && !force) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: "Cannot complete work order — unchecked acceptance criteria found.",
              uncheckedCount: unchecked.length,
              totalCriteria: parsed.criteriaTotal,
              uncheckedCriteria: unchecked.map(c => c.text),
              hint: "Check all criteria or use force=true to override (not recommended).",
            }, null, 2),
          }],
        };
      }

      // Update status to Complete
      content = content.replace(
        /\*\*Status:\*\*\s*.+/,
        `**Status:** Complete`
      );

      // Write updated content
      await writeFileSafe(filePath, content);

      // Move to executed/
      const executedDir = join(targetDir, "executed");
      const executedPath = join(executedDir, foundFile);
      await moveFile(filePath, executedPath);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: "Work order completed and moved to executed/.",
            filename: foundFile,
            from: filePath,
            to: executedPath,
            criteriaTotal: parsed.criteriaTotal,
            criteriaChecked: parsed.criteriaChecked + unchecked.length, // all now considered complete
            forced: force && unchecked.length > 0,
          }, null, 2),
        }],
      };
    }
  );
}
