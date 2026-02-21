/**
 * Praxis MCP — Document Parsers
 *
 * Parse Praxis markdown documents into structured data.
 * Uses regex extraction — no markdown AST dependency needed.
 */

// ─── Work Order Parser ───────────────────────────

export interface WOCriterion {
  text: string;
  checked: boolean;
}

export interface ParsedWorkOrder {
  number: number | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  assignedTo: string | null;
  dateCreated: string | null;
  description: string | null;
  criteria: WOCriterion[];
  criteriaTotal: number;
  criteriaChecked: number;
  raw: string;
}

/**
 * Parse a work order markdown file into structured fields.
 *
 * Expected format:
 * ```
 * # Work Order: Title Here
 * - **WO#:** 3
 * - **Status:** Pending
 * - **Priority:** High
 * - **Assigned To:** Claude
 * - **Date Created:** 2026-02-20
 * ## Description
 * ...
 * ## Acceptance Criteria
 * - [ ] Unchecked
 * - [x] Checked
 * ```
 */
export function parseWorkOrder(content: string): ParsedWorkOrder {
  const titleMatch = content.match(/^#\s+Work Order:\s*(.+)$/m);
  const numberMatch = content.match(/\*\*WO#:\*\*\s*(\d+)/);
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  const priorityMatch = content.match(/\*\*Priority:\*\*\s*(.+)/);
  const assignedMatch = content.match(/\*\*Assigned To:\*\*\s*(.+)/);
  const dateMatch = content.match(/\*\*Date Created:\*\*\s*(.+)/);

  // Extract description (between ## Description and next ##)
  const descMatch = content.match(/## Description\s*\n([\s\S]*?)(?=\n## |\n$)/);

  // Extract acceptance criteria checkboxes
  const criteria: WOCriterion[] = [];
  const criteriaRegex = /- \[([ x])\]\s+(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = criteriaRegex.exec(content)) !== null) {
    criteria.push({
      checked: match[1] === "x",
      text: match[2].trim(),
    });
  }

  return {
    number: numberMatch ? parseInt(numberMatch[1], 10) : null,
    title: titleMatch ? titleMatch[1].trim() : null,
    status: statusMatch ? statusMatch[1].trim() : null,
    priority: priorityMatch ? priorityMatch[1].trim() : null,
    assignedTo: assignedMatch ? assignedMatch[1].trim() : null,
    dateCreated: dateMatch ? dateMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim() : null,
    criteria,
    criteriaTotal: criteria.length,
    criteriaChecked: criteria.filter((c) => c.checked).length,
    raw: content,
  };
}

// ─── Context Capsule Parser ──────────────────────

export interface ParsedCapsule {
  activeTask: string | null;
  status: string | null;
  branch: string | null;
  inProgressNotes: string | null;
  lastSession: {
    date: string | null;
    done: string | null;
    next: string | null;
  };
  raw: string;
}

/**
 * Parse a context capsule markdown file into structured fields.
 *
 * Expected sections:
 * - ## Active Task (with **Task:**, **Status:**, **Branch/Area:** fields)
 * - ## In-Progress Notes
 * - ## Last Session Summary (with **Date:**, **What was done:**, **What's next:** fields)
 */
export function parseCapsule(content: string): ParsedCapsule {
  const taskMatch = content.match(/\*\*Task:\*\*\s*(.+)/);
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  const branchMatch = content.match(/\*\*Branch\/Area:\*\*\s*(.+)/);

  // Extract In-Progress Notes section
  const notesMatch = content.match(
    /## In-Progress Notes\s*\n([\s\S]*?)(?=\n## |\n$)/
  );

  // Extract Last Session Summary fields
  const dateMatch = content.match(
    /## Last Session Summary[\s\S]*?\*\*Date:\*\*\s*(.+)/
  );
  const doneMatch = content.match(
    /## Last Session Summary[\s\S]*?\*\*What was done:\*\*\s*(.+)/
  );
  const nextMatch = content.match(
    /## Last Session Summary[\s\S]*?\*\*What's next:\*\*\s*(.+)/
  );

  return {
    activeTask: taskMatch ? taskMatch[1].trim() : null,
    status: statusMatch ? statusMatch[1].trim() : null,
    branch: branchMatch ? branchMatch[1].trim() : null,
    inProgressNotes: notesMatch ? notesMatch[1].trim() : null,
    lastSession: {
      date: dateMatch ? dateMatch[1].trim() : null,
      done: doneMatch ? doneMatch[1].trim() : null,
      next: nextMatch ? nextMatch[1].trim() : null,
    },
    raw: content,
  };
}

// ─── Checkpoint Parser ───────────────────────────

export interface Milestone {
  number: number;
  text: string;
  date: string;
  status: string;
}

export interface ParsedCheckpoint {
  milestones: Milestone[];
  currentPhase: string | null;
  phaseDescription: string | null;
  raw: string;
}

/**
 * Parse a checkpoint markdown file into structured fields.
 *
 * Expected format:
 * ```
 * ## Milestones
 * | # | Milestone | Date | Status |
 * |---|-----------|------|--------|
 * | 1 | Description | 2026-02-20 | Done |
 *
 * ## Current Phase
 * **Phase:** 2 -- Core UI Components
 * **Description:** ...
 * ```
 */
export function parseCheckpoint(content: string): ParsedCheckpoint {
  const milestones: Milestone[] = [];

  // Parse milestone table rows (skip header and separator)
  const tableRowRegex = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/gm;
  let match: RegExpExecArray | null;
  while ((match = tableRowRegex.exec(content)) !== null) {
    milestones.push({
      number: parseInt(match[1], 10),
      text: match[2].trim(),
      date: match[3].trim(),
      status: match[4].trim(),
    });
  }

  // Parse current phase
  const phaseMatch = content.match(/\*\*Phase:\*\*\s*(.+)/);
  const descMatch = content.match(/## Current Phase[\s\S]*?\*\*Description:\*\*\s*(.+)/);

  return {
    milestones,
    currentPhase: phaseMatch ? phaseMatch[1].trim() : null,
    phaseDescription: descMatch ? descMatch[1].trim() : null,
    raw: content,
  };
}

// ─── Source of Truth Parser ──────────────────────

export interface ParsedSOT {
  decisionsCount: number;
  referencedPaths: string[];
  raw: string;
}

/**
 * Parse a source of truth file for key metadata.
 * Counts decisions in the Decisions Log table and extracts referenced dev/ paths.
 */
export function parseSOT(content: string): ParsedSOT {
  // Count decision rows (lines starting with | followed by a number)
  const decisionRows = content.match(/^\|\s*\d+\s*\|/gm);
  const decisionsCount = decisionRows ? decisionRows.length : 0;

  // Extract referenced dev/ paths
  const pathMatches = content.match(/dev\/[a-z_\-/]+/g);
  const referencedPaths = pathMatches ? [...new Set(pathMatches)] : [];

  return {
    decisionsCount,
    referencedPaths,
    raw: content,
  };
}
