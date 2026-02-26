/**
 * Praxis MCP — Naming Utilities
 *
 * File naming convention enforcement and work order numbering.
 * Convention: {number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}
 */

import { NAMING_REGEX, PATCH_SUFFIX_REGEX } from "./constants.js";

/**
 * Get today's date in ISO format (YYYY-MM-DD).
 */
export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert a title string to UPPER_SNAKE_CASE.
 * "Fix the authentication bug" -> "FIX_THE_AUTHENTICATION_BUG"
 */
export function toUpperSnakeCase(title: string): string {
  return title
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "") // remove non-alphanumeric except spaces
    .replace(/\s+/g, "_")           // spaces to underscores
    .toUpperCase();
}

/**
 * Determine the next work order number from a list of existing filenames.
 * Scans for the highest number prefix and returns highest + 1.
 * Skips 0 (reserved for READMEs/examples). Minimum return is 1.
 */
export function nextWoNumber(existingFiles: string[]): number {
  let highest = 0;

  for (const file of existingFiles) {
    const match = file.match(NAMING_REGEX);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }

  return Math.max(highest + 1, 1);
}

/**
 * Format a filename per Praxis naming convention.
 * Returns: "{number}_{YYYY-MM-DD}_{DESCRIPTION}.md"
 */
export function formatFilename(
  number: number,
  date: string,
  description: string
): string {
  const desc = toUpperSnakeCase(description);
  return `${number}_${date}_${desc}.md`;
}

/**
 * Validate whether a filename matches the Praxis naming convention.
 */
export function isValidPraxisFilename(filename: string): boolean {
  return NAMING_REGEX.test(filename);
}

/**
 * Extract the number from a Praxis-convention filename.
 * Returns null if the filename doesn't match the convention.
 */
export function extractNumber(filename: string): number | null {
  const match = filename.match(NAMING_REGEX);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract the patch number from a filename with _P{NN} suffix.
 * "5_2026-02-20_TASK_P01.md" → "01", "5_2026-02-20_TASK.md" → null
 */
export function extractPatchNumber(filename: string): string | null {
  const match = filename.match(PATCH_SUFFIX_REGEX);
  return match ? match[1] : null;
}

/**
 * Format a patch work order filename.
 * Returns: "{parentNumber}_{YYYY-MM-DD}_{DESCRIPTION}_P{NN}.md"
 */
export function formatPatchFilename(
  parentNumber: number,
  date: string,
  description: string,
  patchNumber: string
): string {
  const desc = toUpperSnakeCase(description);
  return `${parentNumber}_${date}_${desc}_P${patchNumber}.md`;
}

/**
 * Determine the next patch number for a given parent WO.
 * Scans existing files for the highest _P{NN} suffix matching the parent number.
 * Returns the next patch as zero-padded string (e.g., "01", "02").
 */
export function nextPatchNumber(existingFiles: string[], parentNumber: number): string {
  let highest = 0;
  const parentPrefix = `${parentNumber}_`;

  for (const file of existingFiles) {
    if (!file.startsWith(parentPrefix)) continue;
    const patchNum = extractPatchNumber(file);
    if (patchNum) {
      const num = parseInt(patchNum, 10);
      if (num > highest) highest = num;
    }
  }

  return String(highest + 1).padStart(2, "0");
}
