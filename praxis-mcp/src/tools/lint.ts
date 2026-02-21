/**
 * Praxis MCP — Lint Tool
 *
 * lint: Run praxis-lint.sh and return structured JSON findings
 */

import { z } from "zod";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fileExists } from "../lib/fs-helpers.js";

const execFileAsync = promisify(execFile);

function getProjectPath(override?: string): string {
  return override || process.env.PRAXIS_PROJECT_DIR || process.cwd();
}

export function registerLintTool(server: McpServer): void {

  server.tool(
    "lint",
    "Run the Praxis methodology linter (praxis-lint.sh) against a project. Validates 7 categories: structure, context freshness, work order integrity, naming conventions, security, SOT consistency, and orphan detection. Returns structured findings.",
    {
      project_path: z.string().optional().describe("Project root path. Defaults to PRAXIS_PROJECT_DIR env var."),
      tier: z.enum(["auto", "starter", "standard", "full"]).optional().default("auto").describe("Force a specific tier."),
      strict: z.boolean().optional().default(false).describe("Treat warnings as failures."),
      fix: z.boolean().optional().default(false).describe("Auto-create missing directories."),
      skip_security: z.boolean().optional().default(false).describe("Skip the security scan."),
      skip_freshness: z.boolean().optional().default(false).describe("Skip context freshness checks."),
    },
    async ({ project_path, tier, strict, fix, skip_security, skip_freshness }) => {
      const projectPath = getProjectPath(project_path);

      // Find the linter script — check project first, then look for .praxis/ in parent dirs
      let linterPath: string | null = null;

      const candidates = [
        join(projectPath, ".praxis", "praxis-lint.sh"),
        join(projectPath, "praxis-lint.sh"),
      ];

      for (const candidate of candidates) {
        if (await fileExists(candidate)) {
          linterPath = candidate;
          break;
        }
      }

      if (!linterPath) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: "praxis-lint.sh not found.",
              searchedPaths: candidates,
              hint: "Copy the .praxis/ folder from the Praxis template into your project root, or specify the correct project path.",
            }, null, 2),
          }],
        };
      }

      // Build command arguments
      const args = [linterPath, "--json", "--quiet", "--path", projectPath];

      if (tier && tier !== "auto") args.push("--tier", tier);
      if (strict) args.push("--strict");
      if (fix) args.push("--fix");
      if (skip_security) args.push("--skip-security");
      if (skip_freshness) args.push("--skip-freshness");

      try {
        const { stdout, stderr } = await execFileAsync("bash", args, {
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        });

        // Try to parse JSON output
        try {
          const parsed = JSON.parse(stdout);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(parsed, null, 2),
            }],
          };
        } catch {
          // If JSON parsing fails, return raw output
          return {
            content: [{
              type: "text" as const,
              text: stdout || stderr || "Linter produced no output.",
            }],
          };
        }
      } catch (err: unknown) {
        // execFile throws on non-zero exit codes, but exit 1 (warnings) and 2 (failures)
        // are expected from the linter. Check if stdout has valid JSON.
        const execError = err as { stdout?: string; stderr?: string; code?: number };

        if (execError.stdout) {
          try {
            const parsed = JSON.parse(execError.stdout);
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify(parsed, null, 2),
              }],
            };
          } catch {
            // Fall through to error
          }
        }

        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Linter execution failed: ${execError.stderr || String(err)}`,
          }],
        };
      }
    }
  );
}
