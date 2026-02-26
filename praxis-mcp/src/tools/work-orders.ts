/**
 * Praxis MCP — Work Order Tools
 *
 * list_work_orders: List WOs with status/agent filters
 * read_work_order: Read and parse a specific WO
 * create_work_order: Create WO with naming convention enforcement
 * complete_work_order: Validate criteria then move to executed/
 */

import { z } from "zod";
import { join, basename, dirname } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { detectMode } from "../lib/detection.js";
import { readFileSafe, writeFileSafe, moveFile, resolveDevPath, listMarkdownFiles, listSubdirectories, fileExists, getFileAgeDays, discoverLanes, resolveExecutedDir, ensureDir } from "../lib/fs-helpers.js";
import { parseWorkOrder } from "../lib/parsers.js";
import { nextWoNumber, formatFilename, formatPatchFilename, nextPatchNumber, todayISO, toUpperSnakeCase } from "../lib/naming.js";
import { WO_TEMPLATE, PATCH_WO_TEMPLATE, LANE_REGEX } from "../lib/constants.js";

function getProjectPath(override?: string): string {
  return override || process.env.PRAXIS_PROJECT_DIR || process.cwd();
}

export function registerWorkOrderTools(server: McpServer): void {

  // ─── list_work_orders ────────────────────────────

  server.tool(
    "list_work_orders",
    "List all work orders in the Praxis queue. In solo mode, scans dev/work-orders/. In triangle mode, scans agent-specific subfolders (wo_claude/, wo_codex/, etc.) including lane subfolders. Returns parsed metadata for each WO.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      status: z.enum(["pending", "executed", "all"]).optional().default("pending").describe("Filter by status."),
      agent: z.string().optional().describe("Filter by agent name (e.g., 'claude'). Only applies in triangle mode."),
      lane: z.string().optional().describe("Filter by lane name (e.g., '10_delivery_academy'). Only applies in triangle mode."),
    },
    async ({ project_path, status, agent, lane }) => {
      const projectPath = getProjectPath(project_path);
      const dev = resolveDevPath(projectPath);
      const woRoot = join(dev, "work-orders");
      const mode = await detectMode(projectPath);

      interface WOEntry {
        filename: string;
        agent: string | null;
        lane: string | null;
        location: "pending" | "executed";
        title: string | null;
        number: number | null;
        status: string | null;
        priority: string | null;
        assignedTo: string | null;
        criteriaTotal: number;
        criteriaChecked: number;
        criteriaNa: number;
        ageDays: number | null;
      }

      const results: WOEntry[] = [];

      async function scanDir(dirPath: string, agentName: string | null, laneName: string | null, location: "pending" | "executed") {
        const files = await listMarkdownFiles(dirPath);
        for (const file of files) {
          const content = await readFileSafe(join(dirPath, file));
          if (!content) continue;
          const parsed = parseWorkOrder(content);
          const age = await getFileAgeDays(join(dirPath, file));
          results.push({
            filename: file,
            agent: agentName,
            lane: laneName,
            location,
            title: parsed.title,
            number: parsed.number,
            status: parsed.status,
            priority: parsed.priority,
            assignedTo: parsed.assignedTo,
            criteriaTotal: parsed.criteriaTotal,
            criteriaChecked: parsed.criteriaChecked,
            criteriaNa: parsed.criteriaNa,
            ageDays: age,
          });
        }
      }

      if (mode === "triangle") {
        const agentDirs = await listSubdirectories(woRoot, "wo_");
        for (const dir of agentDirs) {
          const agentName = dir.replace("wo_", "");
          if (agent && agentName !== agent) continue;

          const agentPath = join(woRoot, dir);

          // Scan top-level WOs (not in lanes)
          if (!lane) {
            if (status === "pending" || status === "all") {
              await scanDir(agentPath, agentName, null, "pending");
            }
            if (status === "executed" || status === "all") {
              const execDir = await resolveExecutedDir(agentPath);
              await scanDir(execDir, agentName, null, "executed");
            }
          }

          // Scan lane subfolders
          const lanes = await discoverLanes(agentPath);
          for (const laneName of lanes) {
            if (lane && laneName !== lane) continue;

            const laneDir = join(agentPath, laneName);

            if (status === "pending" || status === "all") {
              await scanDir(laneDir, agentName, laneName, "pending");
            }
            if (status === "executed" || status === "all") {
              // Check centralized _executed/{lane}/, then lane-local _executed/, then legacy executed/
              const centralExec = join(agentPath, "_executed", laneName);
              const laneExec = await resolveExecutedDir(laneDir);
              if (await fileExists(centralExec)) {
                await scanDir(centralExec, agentName, laneName, "executed");
              } else {
                await scanDir(laneExec, agentName, laneName, "executed");
              }
            }
          }
        }
      } else {
        // Solo mode
        if (status === "pending" || status === "all") {
          await scanDir(woRoot, null, null, "pending");
        }
        if (status === "executed" || status === "all") {
          const execDir = await resolveExecutedDir(woRoot);
          await scanDir(execDir, null, null, "executed");
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
    "Read and parse a specific Praxis work order by number or filename. Searches across lanes and executed directories. Returns the full content plus structured metadata (status, priority, acceptance criteria with completion state, patch info).",
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

      // Determine search directories (including lanes)
      const searchDirs: string[] = [];

      async function addAgentSearchDirs(agentPath: string) {
        // Top-level agent dir
        searchDirs.push(agentPath);
        // Executed dirs (prefer _executed/ over executed/)
        const execDir = await resolveExecutedDir(agentPath);
        searchDirs.push(execDir);
        // Lane subdirectories
        const lanes = await discoverLanes(agentPath);
        for (const laneName of lanes) {
          searchDirs.push(join(agentPath, laneName));
          // Centralized executed for lane
          searchDirs.push(join(agentPath, "_executed", laneName));
          // Lane-local executed
          const laneExec = await resolveExecutedDir(join(agentPath, laneName));
          if (laneExec !== join(agentPath, laneName, "_executed")) {
            searchDirs.push(laneExec);
          }
        }
      }

      if (mode === "triangle" && agent) {
        await addAgentSearchDirs(join(woRoot, `wo_${agent}`));
      } else if (mode === "triangle") {
        const agentDirs = await listSubdirectories(woRoot, "wo_");
        for (const dir of agentDirs) {
          await addAgentSearchDirs(join(woRoot, dir));
        }
      } else {
        searchDirs.push(woRoot);
        const execDir = await resolveExecutedDir(woRoot);
        searchDirs.push(execDir);
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
                  raw: undefined,
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
    "Create a new Praxis work order with all required fields. Auto-assigns the next sequential number and formats the filename per Praxis naming convention ({number}_{YYYY-MM-DD}_{DESCRIPTION}.md). Supports lane routing for subproject organization.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      title: z.string().describe("Short title for the work order (used in filename)."),
      description: z.string().describe("Detailed description of what needs to be done."),
      priority: z.enum(["Critical", "High", "Medium", "Low"]).optional().default("Medium").describe("Priority level."),
      assigned_to: z.string().optional().default("unassigned").describe("Agent name (e.g., 'Claude')."),
      acceptance_criteria: z.array(z.string()).min(1).describe("List of acceptance criteria (each becomes a checkbox)."),
      agent: z.string().optional().describe("Target agent folder for triangle mode (e.g., 'claude')."),
      lane: z.string().optional().describe("Target lane subfolder (e.g., '10_delivery_academy'). Creates lane if it doesn't exist."),
      batch: z.number().optional().describe("Batch number for grouping (0-3)."),
      notes: z.string().optional().describe("Additional notes."),
    },
    async ({ project_path, title, description, priority, assigned_to, acceptance_criteria, agent, lane, batch, notes }) => {
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

      // Route to lane if specified
      if (lane) {
        targetDir = join(targetDir, lane);
        await ensureDir(targetDir);
      }

      // Get next number (scan lane or top-level)
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
            lane: lane ?? null,
            criteriaCount: acceptance_criteria.length,
          }, null, 2),
        }],
      };
    }
  );

  // ─── complete_work_order ─────────────────────────

  server.tool(
    "complete_work_order",
    "Mark a work order as complete and move it to the executed/ folder. Validates that ALL acceptance criteria checkboxes are checked (N/A criteria count as resolved). Supports lane-aware completion paths.",
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

      // Find the WO file — search top-level + all lanes
      let agentDir: string;
      if (mode === "triangle" && agent) {
        agentDir = join(woRoot, `wo_${agent}`);
      } else {
        agentDir = woRoot;
      }

      const isNumeric = /^\d+$/.test(identifier);
      const searchPrefix = isNumeric ? `${identifier}_` : null;

      let foundFile: string | null = null;
      let foundDir: string | null = null;
      let foundLane: string | null = null;

      // Search top-level first
      const topFiles = await listMarkdownFiles(agentDir, { includeExamples: true });
      for (const file of topFiles) {
        if (file === identifier || (searchPrefix && file.startsWith(searchPrefix))) {
          foundFile = file;
          foundDir = agentDir;
          break;
        }
      }

      // Then search lanes
      if (!foundFile) {
        const lanes = await discoverLanes(agentDir);
        for (const laneName of lanes) {
          const laneDir = join(agentDir, laneName);
          const laneFiles = await listMarkdownFiles(laneDir, { includeExamples: true });
          for (const file of laneFiles) {
            if (file === identifier || (searchPrefix && file.startsWith(searchPrefix))) {
              foundFile = file;
              foundDir = laneDir;
              foundLane = laneName;
              break;
            }
          }
          if (foundFile) break;
        }
      }

      if (!foundFile || !foundDir) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Work order "${identifier}" not found in ${agentDir}. Use list_work_orders to see available WOs.`,
          }],
        };
      }

      const filePath = join(foundDir, foundFile);
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

      // Validate criteria — N/A criteria are already marked checked by parser
      const unchecked = parsed.criteria.filter(c => !c.checked && !c.na);
      if (unchecked.length > 0 && !force) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: "Cannot complete work order — unchecked acceptance criteria found.",
              uncheckedCount: unchecked.length,
              totalCriteria: parsed.criteriaTotal,
              naCriteria: parsed.criteriaNa,
              uncheckedCriteria: unchecked.map(c => c.text),
              hint: "Check all criteria, mark inapplicable ones as N/A, or use force=true to override.",
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

      // Determine execution destination
      let executedDir: string;
      if (foundLane) {
        // Lane WO → centralized _executed/{lane}/
        executedDir = join(agentDir, "_executed", foundLane);
      } else {
        // Top-level WO → _executed/ (prefer new convention)
        executedDir = await resolveExecutedDir(agentDir);
      }

      const executedPath = join(executedDir, foundFile);
      await moveFile(filePath, executedPath);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: `Work order completed and moved to ${basename(dirname(executedPath))}/${basename(executedPath)}.`,
            filename: foundFile,
            from: filePath,
            to: executedPath,
            lane: foundLane,
            criteriaTotal: parsed.criteriaTotal,
            criteriaChecked: parsed.criteriaChecked,
            criteriaNa: parsed.criteriaNa,
            forced: force && unchecked.length > 0,
          }, null, 2),
        }],
      };
    }
  );

  // ─── create_patch_work_order ─────────────────────

  server.tool(
    "create_patch_work_order",
    "Create a patch work order that extends an existing parent WO. Patch WOs carry parent metadata and use the _P{NN} suffix convention. Useful for fixing issues found after the parent WO was completed.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      parent_identifier: z.string().describe("Parent WO number (e.g., '5') or filename."),
      title: z.string().describe("Short title for the patch (used in filename)."),
      description: z.string().describe("What the patch addresses."),
      acceptance_criteria: z.array(z.string()).min(1).describe("Patch acceptance criteria."),
      agent: z.string().optional().describe("Agent folder (triangle mode, e.g., 'claude')."),
      lane: z.string().optional().describe("Lane subfolder (e.g., '10_delivery_academy')."),
      priority: z.enum(["Critical", "High", "Medium", "Low"]).optional().default("High").describe("Priority level."),
      assigned_to: z.string().optional().default("unassigned").describe("Agent name."),
    },
    async ({ project_path, parent_identifier, title, description, acceptance_criteria, agent, lane, priority, assigned_to }) => {
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
      if (lane) {
        targetDir = join(targetDir, lane);
        await ensureDir(targetDir);
      }

      // Resolve parent number
      const isNumeric = /^\d+$/.test(parent_identifier);
      const parentNumber = isNumeric ? parseInt(parent_identifier, 10) : null;

      if (!parentNumber) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Could not resolve parent WO number from "${parent_identifier}". Provide a numeric WO number.`,
          }],
        };
      }

      // Scan for existing patches to determine next number
      const existingFiles = await listMarkdownFiles(targetDir, { includeExamples: true });
      // Also scan executed dirs for existing patches
      const execDir = await resolveExecutedDir(targetDir);
      const execFiles = await listMarkdownFiles(execDir, { includeExamples: true });
      const allFiles = [...existingFiles, ...execFiles];
      // Check centralized executed too
      if (lane) {
        const centralDir = mode === "triangle" && agent
          ? join(woRoot, `wo_${agent}`, "_executed", lane)
          : join(woRoot, "_executed", lane);
        const centralFiles = await listMarkdownFiles(centralDir, { includeExamples: true });
        allFiles.push(...centralFiles);
      }

      const patchNum = nextPatchNumber(allFiles, parentNumber);
      const date = todayISO();
      const filename = formatPatchFilename(parentNumber, date, title, patchNum);
      const sequenceKey = `${parentNumber}.${patchNum}`;

      // Build patch WO content
      const criteriaLines = acceptance_criteria.map(c => `- [ ] ${c}`).join("\n");
      const content = PATCH_WO_TEMPLATE
        .replace("{TITLE}", title)
        .replace("{NUMBER}", String(parentNumber))
        .replace("{DATE}", date)
        .replace("{ASSIGNED_TO}", assigned_to ?? "unassigned")
        .replace("{PRIORITY}", priority ?? "High")
        .replace("{PARENT_WO}", String(parentNumber))
        .replace("{PATCH_NUMBER}", `P${patchNum}`)
        .replace("{SEQUENCE_KEY}", sequenceKey)
        .replace("{DESCRIPTION}", description)
        .replace("{CRITERIA}", criteriaLines);

      const filePath = join(targetDir, filename);
      await writeFileSafe(filePath, content);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: "Patch work order created successfully.",
            filename,
            path: filePath,
            parentWo: parentNumber,
            patchNumber: `P${patchNum}`,
            sequenceKey,
            lane: lane ?? null,
            criteriaCount: acceptance_criteria.length,
          }, null, 2),
        }],
      };
    }
  );
}
