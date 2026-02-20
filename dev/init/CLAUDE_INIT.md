# Praxis v1.1 -- Claude Code Initialization

**Provider:** Claude Code (Anthropic)
**Role:** Primary Worker (implements code, agents, skills, tests)
**Purpose:** Bootstrap the Praxis with Claude Code-specific features
**Extras over generic:** CLAUDE.md integration, .claude/agents/, .claude/skills/, Task tool integration

---

## What This Is

The Praxis is a filesystem-based AI development methodology. This is the Claude Code-specific initialization prompt -- it does everything the generic `DEV_STACK_INIT.md` does, plus leverages Claude Code features: CLAUDE.md project config, specialized agents (`.claude/agents/`), slash-command skills (`.claude/skills/`), and the Task tool for progress tracking.

**How to use:** Paste this into a Claude Code session, or reference it from your CLAUDE.md. Claude will detect whether this is a new or existing project and act accordingly.

### Solo vs Triangle Mode

If `CODEX_INIT.md` and `GEMINI_INIT.md` exist alongside this file, this project uses the **Triangle Pattern** -- a multi-AI orchestration model where:

- **Codex** is the manager (creates WOs, reviews plans, performs audits)
- **Claude** is the worker (implements code, deploys agents/skills, runs tests) -- **this file**
- **Gemini** is the librarian (researches, verifies SOT, indexes the codebase)

**In Triangle mode:** Claude waits for work orders from Codex in `work-orders/wo_claude/`, enters plan mode for each WO, submits the plan for Codex review, and implements only after approval.

**In Solo mode** (no CODEX_INIT.md present): Claude operates independently using the full MODE A/B flow below. All Triangle-specific rules (14-15) are ignored. Work orders live as a flat queue in `work-orders/`.

---

## Step 1: Detect Mode

Use the Glob tool to check if `dev/source_of_truth.md` exists in the project root.

- **Does NOT exist** --> **MODE A: New Project Bootstrap**
- **Exists** --> **MODE B: Existing Project Conformance**

---

## MODE A: New Project Bootstrap (Claude Code)

### A1. Create Folder Structure

Use the Bash tool to create the complete directory tree:

**Solo mode (default):**
```bash
mkdir -p dev/{init,research/{active,archive},planning/master-plan/{draft,approved},work-orders/executed,commands/{active,executed},audit/{current,legacy},reports/{draft/{html,written},published/{html,written}},design/{audit/screenshots,language,resources},archive}
```

**Triangle mode** (when multiple agents needed):
```bash
mkdir -p dev/{init,research/{active,archive},planning/master-plan/{draft,approved},work-orders/{wo_claude/executed,wo_codex/executed,wo_gemini/executed},commands/{active,executed},audit/{current,legacy},reports/{draft/{html,written},published/{html,written}},design/{audit/screenshots,language,resources},archive}
```

### A2. Discover Project Context

Before creating context documents, read the codebase:

1. Use Glob to find key files: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `*.csproj`, `docker-compose*.yml`, `Makefile`
2. Use Read on each to extract: tech stack, dependencies, framework, language
3. Use Glob for `**/*.md` to find existing documentation
4. Use Bash for `git log --oneline -20` to understand recent activity (if git repo)

### A3. Initialize Core Documents

Use the Write tool to create three files. Populate project-specific sections using what you discovered in A2:

**dev/source_of_truth.md:**
- Copy the Development Lifecycle from the end of this document
- Copy the Operating Rules from the end of this document
- Fill in: File Naming Convention, Workflow definitions, Dev Folder Structure tree
- Fill in Project-Specific: tech stack (from package.json etc.), origin, project structure
- Start Decisions Log with: "Decision 1: Adopted Praxis methodology"

**dev/context_capsule.md:**
- Active Task: "Project initialization" / in-progress
- In-Progress Notes: List what was discovered about the codebase
- Critical Rules: Copy the 8 workspace rules
- Last Session: Today's date, "Praxis initialized, codebase discovered"

**dev/checkpoint.md:**
- Milestone 1: "Praxis initialized" / today's date / Done
- Current Phase: Setup

### A4. Integrate with CLAUDE.md (Provider Config Injection)

**CRITICAL: Do NOT replace or template the CLAUDE.md.** If a CLAUDE.md already exists at the project root, READ it first and INJECT the context handoff section. If no CLAUDE.md exists, create one following Claude Code's standard recommendations, THEN inject the handoff.

**What to inject** (append or insert into the existing CLAUDE.md):

```markdown
## Context Handoff (Praxis)

- **Read order (every session):**
  1. `dev/source_of_truth.md` (canonical state)
  2. `dev/context_capsule.md` (live handoff)
  3. `dev/checkpoint.md` (progress milestones)
  4. Latest WO in `dev/work-orders/`
  5. This file for role-specific guidance
- **Write order (end of session):**
  1. Update `dev/source_of_truth.md` for new decisions/results
  2. Update `dev/context_capsule.md` (brief status + next steps)
  3. Update `dev/checkpoint.md` for completed milestones
  4. Create new WO if tasks emerge
  5. For multi-step commands, create docs in `dev/commands/active/`
- If any file conflicts with `dev/source_of_truth.md`, **source_of_truth.md wins**.

## Praxis Rules

- **Operator command delivery:** Never paste multiline commands in chat. Write to `dev/commands/active/` and reference the doc path + step number.
- **Draft/published wall:** AI writes to `draft/` only. Admin promotes to `published/`.
- **File naming:** `{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}` (Number 0 = READMEs/examples)
```

**Also update the existing CLAUDE.md to reference:**
- File Map: key dev/ folders
- Non-Negotiables: any project constraints discovered in A2
- Agents & Skills: any agents/skills created in A7

### A5. Architecture Audit

If the project has existing code (not greenfield), perform an initial assessment:

1. Use Read to examine key source files, configs, and tests
2. Use TaskCreate to track: "Performing initial architecture audit"
3. Use Write to save the audit report to `dev/audit/current/1_{today}_INITIAL_ARCHITECTURE_AUDIT.md`

Use the format from DEV_STACK_INIT.md section A4.

### A6. Create First Work Orders (Batch 0 Only)

**Only create Batch 0 (Critical) work orders during init.** Security vulnerabilities, broken builds, data loss risks. Non-critical findings stay in the master plan draft.

Use Write to create WOs in `dev/work-orders/` (Solo mode) or `dev/work-orders/wo_claude/` (Triangle mode):

```markdown
# Work Order: [Description]

- **WO#:** [number]
- **Date Created:** YYYY-MM-DD
- **Status:** Pending
- **Assigned To:** Claude
- **Priority:** Critical
- **Batch:** 0

## Description
[What needs to be done and why]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

If no critical issues are found, skip WO creation entirely. Everything else goes in the master plan draft.

### A7. Setup .claude/ Directory (Adaptive Deployment)

Claude analyzes the codebase to classify the project type, then deploys only the agents and skills that project type actually needs. This is conservative by design -- fewer, targeted agents are better than a large unfocused roster.

#### A7a. Classify Project Type

Based on what was discovered in A2, classify the project:

| Project Type | Signals |
|-------------|---------|
| Web App | React/Next.js/Vue, pages/routes, CSS/styling |
| API | Express/FastAPI/Flask, route handlers, no frontend |
| CLI Tool | bin/ entry, commander/yargs, no HTTP server |
| Library | exports only, no entry point, published to npm/PyPI |
| Infrastructure | Docker, Terraform, Ansible, server configs |
| Monorepo | packages/, workspaces, multiple package.json files |

#### A7b. Select Agents and Skills by Project Type

Deploy ONLY the agents and skills for the detected project type:

| Project Type | Agents | Skills |
|-------------|--------|--------|
| Web App | code-reviewer, test-writer | /pdf |
| API | code-reviewer, test-writer | /pdf |
| CLI Tool | code-reviewer | /pdf |
| Library | code-reviewer, test-writer | /pdf |
| Infrastructure | doc-writer, troubleshooter | /report-writer, /pdf |
| Monorepo | code-reviewer, test-writer, doc-writer | /pdf |

#### A7c. Create Selected Agents

For each selected agent, create a file in `.claude/agents/`:

```markdown
# Agent: [name]

[Role description -- what this agent specializes in]

## Instructions
- Read dev/source_of_truth.md for project rules
- Read dev/context_capsule.md for current state
- [Domain-specific instructions]
- Update dev/context_capsule.md before ending
```

#### A7d. Create Selected Skills

For each selected skill, create a file in `.claude/skills/`:

```markdown
# Skill: /[name]

[What this skill does when invoked]

## Instructions
[Step-by-step execution instructions]
```

#### A7e. Update CLAUDE.md

Add the new agents and skills to the CLAUDE.md file map, agents section, and skills section.

#### A7f. Announce to Admin

Print:

```
AGENTS & SKILLS DEPLOYED
=========================
Project type: [classification]
Agents created: [list]
Skills created: [list]

ACTION REQUIRED: Restart your Claude Code session to register the new agents and skills.
```

### A8. Report Initialization Complete

Use TaskUpdate to mark initialization complete. Print summary:
- Files created (list each)
- Tech stack detected
- Provider config updated (context handoff injected into CLAUDE.md)
- Audit verdict (if performed)
- Critical work orders created (if any, Batch 0 only)
- What needs admin review

---

## MODE B: Existing Project Conformance (Claude Code)

### B1. Read Context Chain

Use the Read tool on each file in order:
1. `CLAUDE.md` (project root)
2. `dev/source_of_truth.md`
3. `dev/context_capsule.md`
4. `dev/checkpoint.md`
5. Latest pending WO in `dev/work-orders/` (Solo) or `dev/work-orders/wo_claude/` (Triangle)

### B2. Structural Conformance Check

**If `tools/praxis-lint.sh` exists**, run it via Bash tool:

```bash
bash tools/praxis-lint.sh
```

Report findings to the user. If there are failures, offer to fix them before starting new work. Use `--fix` to auto-create missing directories.

**Claude Code SessionStart hook:** If the project has `.claude/settings.json` with a SessionStart hook for praxis-lint, the linter runs automatically at session start and its output is available as context. Check for lint findings in the session context before proceeding.

**If the linter is not available**, use Glob to verify the dev/ folder structure:

```
dev/source_of_truth.md
dev/context_capsule.md
dev/checkpoint.md
dev/research/{active,archive}/
dev/planning/master-plan/{draft,approved}/
dev/work-orders/{executed}/
dev/commands/{active,executed}/
dev/audit/{current,legacy}/
dev/reports/draft/{html,written}/
dev/reports/published/{html,written}/
dev/design/{audit/screenshots,language,resources}/
dev/archive/
```

Report: missing directories, non-conforming file names, stale WOs.

### B3. Architecture Audit (if stale)

Check `dev/audit/current/` for the most recent audit. If none exists or the most recent is older than 2 weeks, perform a fresh audit using the format from A5.

### B4. CLAUDE.md Conformance

Read `CLAUDE.md` and verify it contains:
- [ ] Context Handoff section (read + write order referencing dev/ docs)
- [ ] Quick Context (project, tech stack, origin)
- [ ] File Map (including dev/ structure)

If the Context Handoff section is missing, **inject it** using the template from A4. Do not overwrite other content.

### B5. Agent Conformance Audit

Use Glob to find `.claude/agents/*.md`. Read each agent file and check:

- [ ] References the context chain (SOT --> capsule --> checkpoint)?
- [ ] Follows the session end protocol (update capsule, checkpoint)?
- [ ] Instructions are current with codebase state?
- [ ] Respects draft/published separation?

Create conformance WOs for agents that need updating.

### B6. Update Context Documents

- Update `dev/context_capsule.md`: date, what was audited, findings, next steps
- Add checkpoint milestone: "Praxis conformance audit performed"

---

## Operating Rules (Always Active)

1. **Non-destructive** -- Never SSH to production. Local copies only.
2. **Self-contained projects** -- Every project gets its own `dev/` folder.
3. **No files at workspace root** -- All output into project folders or dev structure.
4. **Draft/published wall** -- AI writes to `draft/` only. Admin promotes to `published/`.
5. **Items to `executed/` only when complete** -- Pending items stay in parent folder.
6. **File naming:** `{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}` -- Number 0 = READMEs.
7. **Admin runs commands** -- AI writes to `dev/commands/active/`, admin executes.
8. **Context docs updated every session end** -- SOT (decisions), capsule (summary), checkpoint (milestones).

## Claude Code-Specific Rules

9. **CLAUDE.md is the entrypoint** -- Read it first every session.
10. **Use .claude/agents/** for specialized subtasks via the Task tool.
11. **Use .claude/skills/** for repeatable workflows invoked with `/skill-name`.
12. **Never paste multiline commands in chat** -- Write to `dev/commands/active/` instead.
13. **Use TaskCreate/TaskUpdate** for multi-step operations to track progress.

## Triangle Pattern Rules (active only when CODEX_INIT.md is present)

14. **Plan mode for every WO** -- In Triangle mode, enter plan mode for every work order received from Codex. Write the implementation plan, then wait for Codex review before implementing. Do not implement without approval.
15. **Deploy agents conservatively** -- Prefer fewer, targeted agents over a large roster. Only deploy agents that match the detected project type. If unsure whether an agent is needed, skip it -- it can always be added later.

## Provider Integration Rule

The dev/ methodology does NOT control how provider config files (CLAUDE.md, etc.) are created. Providers should create their configs per their own recommendations. The dev init process then **injects** the context handoff section into the provider's existing config file -- augmenting it, never replacing it.

## Session End Protocol (Claude Code)

Before ending any session:

1. Update `dev/source_of_truth.md` -- New decisions to Decisions Log
2. Update `dev/context_capsule.md` -- Date, what was done, what's next
3. Update `dev/checkpoint.md` -- New milestones for completed work
4. Update `CLAUDE.md` -- If new agents/skills were created or file map changed

---

*Praxis v1.1 -- Claude Code Edition*
*Created by Luis Faxas, 2026.*
