/**
 * Praxis MCP — Constants
 *
 * Tier folder maps, core document paths, WO template, naming patterns.
 * All paths are relative to the project's dev/ folder.
 */

// Core context documents (always required, regardless of tier)
export const CORE_DOCS = [
  "source_of_truth.md",
  "context_capsule.md",
  "checkpoint.md",
] as const;

// Folders required at each tier level
export const TIER_FOLDERS: Record<string, string[]> = {
  starter: [
    "work-orders",
    "work-orders/executed",
  ],
  standard: [
    "work-orders",
    "work-orders/executed",
    "research/active",
    "research/archive",
    "planning/master-plan/draft",
    "planning/master-plan/approved",
    "commands/active",
    "commands/executed",
  ],
  full: [
    "work-orders",
    "work-orders/executed",
    "research/active",
    "research/archive",
    "planning/master-plan/draft",
    "planning/master-plan/approved",
    "commands/active",
    "commands/executed",
    "audit/current",
    "audit/legacy",
    "reports/draft/html",
    "reports/draft/written",
    "reports/published/html",
    "reports/published/written",
    "design/audit/screenshots",
    "design/language",
    "design/resources",
    "archive",
    "private",
  ],
};

// The generic init file name (excluded from provider counting)
export const PRAXIS_INIT_FILENAME = "PRAXIS_INIT.md";

// Init file suffix for detecting provider-specific inits
export const INIT_FILE_SUFFIX = "_INIT.md";

// Work order file naming pattern: {number}_{YYYY-MM-DD}_{DESCRIPTION}.md
export const NAMING_REGEX = /^(\d+)_(\d{4}-\d{2}-\d{2})_(.+)\.md$/;

// Work order template used by create_work_order
export const WO_TEMPLATE = `# Work Order: {TITLE}

- **WO#:** {NUMBER}
- **Date Created:** {DATE}
- **Status:** Pending
- **Assigned To:** {ASSIGNED_TO}
- **Priority:** {PRIORITY}

## Description

{DESCRIPTION}

## Acceptance Criteria

{CRITERIA}

## Notes

`;

// Context capsule section headers (used for section-aware updates)
export const CAPSULE_SECTIONS = [
  "Active Task",
  "In-Progress Notes",
  "Critical Rules",
  "Key Workspace Paths",
  "Last Session Summary",
] as const;

// Checkpoint milestone table header
export const CHECKPOINT_TABLE_HEADER = "| # | Milestone | Date | Status |";
export const CHECKPOINT_TABLE_SEPARATOR = "|---|-----------|------|--------|";
