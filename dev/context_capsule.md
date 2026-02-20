# Context Capsule

Current working state for session continuity. AI reads this file at the start of every new chat or after context compaction. This file is the template -- when copied into a new project, fill in the session-specific sections.

## Active Task

- **Task:** (none)
- **Status:** idle
- **Branch/Area:** --

## In-Progress Notes

(no active work)

## Critical Rules (Inherited from Workspace)

These rules are baked in and apply to every project. Do not remove.

- **Non-destructive workspace** -- no SSH to company servers from here. Local copies only.
- **Every new project gets a fresh `dev/` folder** copied from the template
- **Never create files at the workspace root** -- all output goes into project folders or the dev structure
- **Only the admin moves reports to `published/`** -- AI writes to `draft/` only
- **Items only move to `executed/` when complete** -- work orders, commands, etc. stay in parent folder while pending
- **Live project import flow:** Admin transfers from server --> AI scaffolds `dev/` and reviews (AI never SSH's)
- **File naming:** `{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}` -- number 0 reserved for READMEs
- **Dev folder is the session context source** -- each project is opened independently, dev/ context docs must be self-contained

## Key Workspace Paths

- **Workspace CLAUDE.md:** `<WORKSPACE_ROOT>/CLAUDE.md`
- **Template dev/:** `<WORKSPACE_ROOT>/AI_LEARNING_CENTER/praxis_stack/dev/`
- **HTML Report Template:** `<WORKSPACE_ROOT>/praxis_stack/dev/reports/draft/html/0_2026-02-15_EXAMPLE_REPORT.html`
- **Projects Root:** `<WORKSPACE_ROOT>/_PROJECTS/`

> Replace `<WORKSPACE_ROOT>` with your actual workspace path.

## Last Session Summary

- **Date:** YYYY-MM-DD
- **What was done:** (initial setup -- dev folder scaffolded from template)
- **What's next:** (first work order)
