/**
 * Praxis MCP — Filesystem Helpers
 *
 * Safe file operations that never throw on missing files.
 * All functions are stateless and work with absolute paths.
 */

import { readFile, writeFile, stat, readdir, mkdir, rename } from "node:fs/promises";
import { join, dirname } from "node:path";

/**
 * Read a file safely. Returns null if the file doesn't exist or can't be read.
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Write a file safely, creating parent directories if needed.
 */
export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

/**
 * Get file age in days. Returns null if the file doesn't exist.
 */
export async function getFileAgeDays(filePath: string): Promise<number | null> {
  try {
    const stats = await stat(filePath);
    const now = Date.now();
    const mtime = stats.mtimeMs;
    return Math.floor((now - mtime) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Check if a file or directory exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory.
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * List markdown files in a directory. Returns empty array if dir doesn't exist.
 * Skips files starting with "0_" (reserved for READMEs/examples).
 */
export async function listMarkdownFiles(
  dirPath: string,
  options: { includeExamples?: boolean } = {}
): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    return entries.filter((f) => {
      if (!f.endsWith(".md")) return false;
      if (!options.includeExamples && f.startsWith("0_")) return false;
      return true;
    });
  } catch {
    return [];
  }
}

/**
 * List subdirectories matching a pattern in a directory.
 */
export async function listSubdirectories(dirPath: string, prefix?: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && (!prefix || e.name.startsWith(prefix)))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 * Returns true if the directory was created, false if it already existed.
 */
export async function ensureDir(dirPath: string): Promise<boolean> {
  const existed = await isDirectory(dirPath);
  if (!existed) {
    await mkdir(dirPath, { recursive: true });
    return true;
  }
  return false;
}

/**
 * Move a file from one path to another. Creates target directory if needed.
 */
export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  await mkdir(dirname(toPath), { recursive: true });
  await rename(fromPath, toPath);
}

/**
 * Get file size in bytes. Returns 0 if file doesn't exist.
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Check if a file was modified today (local timezone).
 */
export async function wasModifiedToday(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    const mtime = new Date(stats.mtimeMs);
    const today = new Date();
    return (
      mtime.getFullYear() === today.getFullYear() &&
      mtime.getMonth() === today.getMonth() &&
      mtime.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

/**
 * Resolve the dev/ folder path from a project root.
 */
export function resolveDevPath(projectPath: string): string {
  return join(projectPath, "dev");
}
