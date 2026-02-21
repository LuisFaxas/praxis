# Praxis v1.1 -- Initialization Prompt

**Provider:** Any LLM (Claude, Codex, ChatGPT, Gemini, local models)
**Purpose:** Bootstrap the Praxis methodology in any project

---

## What This Is

The Praxis is a filesystem-based AI development methodology. It gives AI agents structured context (source of truth, session capsules, checkpoints), organizes work through the four-stage development lifecycle, enforces quality through audit pipelines, and separates draft output from published deliverables. This prompt bootstraps the entire system.

**How to use:** Paste this into any AI chat session. The AI will detect whether this is a new or existing project and act accordingly.

### Development Lifecycle

The dev/ folder is organized around a four-stage pipeline. Every folder maps to one of these stages:

```
Research  -->  Planning  -->  Execution  -->  Reports
(gather)      (decide)       (build)        (communicate)
```

| Stage | Folder | Purpose |
|-------|--------|---------|
| Research | `dev/research/` | Gather information before making decisions |
| Planning | `dev/planning/` | Master plans, architectural decisions |
| Execution | `dev/work-orders/`, `dev/commands/` | Actionable tasks, operator scripts |
| Reports | `dev/reports/` | Communicate results to stakeholders |
| Cross-cutting | `dev/audit/`, `dev/design/`, `dev/archive/` | Quality trail, design assets, historical records |

### Solo Mode vs Triangle Mode

Praxis supports two operational modes:

- **Solo mode (default):** One AI agent operates independently. Work orders live directly in `dev/work-orders/` as a flat queue. This is the default when only `PRAXIS_INIT.md` or `CLAUDE_INIT.md` exist.
- **Triangle mode (opt-in):** Multiple AI agents collaborate. Work orders are routed via agent-specific subfolders (`wo_claude/`, `wo_codex/`, `wo_gemini/`). Activated when `CODEX_INIT.md` and/or `GEMINI_INIT.md` exist alongside this file.

**Detection rule:** Check `dev/init/` for which init files exist. If only generic or single-provider init files are present, use Solo mode.

---

## Step 1: Detect Mode

Check if a `dev/` folder exists in the project root.

- **`dev/` folder does NOT exist** --> Go to **MODE A: New Project Bootstrap**
- **`dev/` folder exists** --> Go to **MODE B: Existing Project Conformance**

---

## MODE A: New Project Bootstrap

### A1. Create Folder Structure

Create the following directory tree at the project root:

```
dev/
├── source_of_truth.md
├── context_capsule.md
├── checkpoint.md
│
├── init/                           # Methodology reference docs
│   └── (init files copied here)
│
├── research/                       # Stage 1: GATHER
│   ├── active/                     # Research for current decisions
│   └── archive/                    # Referenced, decisions made
│
├── planning/                       # Stage 2: DECIDE
│   └── master-plan/
│       ├── draft/                  # Working plans (AI writes here)
│       └── approved/               # Finalized plans (admin promotes)
│
├── work-orders/                    # Stage 3: EXECUTE
│   └── executed/                   # Completed work orders
│   # Solo mode: flat queue at root
│   # Triangle mode: wo_claude/, wo_codex/, wo_gemini/ subfolders
│
├── commands/                       # Operator command delivery
│   ├── active/                     # Current command sets (topic subfolders)
│   │   └── {number}_{date}_{TOPIC}/
│   └── executed/                   # Completed command sets
│
├── audit/                          # Quality + conformance trail
│   ├── current/                    # Active audit entries
│   └── legacy/                     # Archived audit entries
│
├── reports/                        # Stage 4: COMMUNICATE
│   ├── draft/
│   │   ├── html/                   # Draft HTML reports
│   │   └── written/                # Draft written reports
│   └── published/
│       ├── html/                   # Published HTML (admin-only)
│       └── written/                # Published written (admin-only)
│
├── design/                         # Design assets + methodology
│   ├── audit/
│   │   └── screenshots/            # Visual captures
│   ├── language/                   # Design language (tokens + Storybook methodology)
│   └── resources/                  # Icons, fonts, logos
│
└── archive/                        # Historical records
    └── {date}_{description}/       # Dated archive batches with manifests
```

**Triangle mode addition:** If Triangle mode is active, replace the flat `work-orders/` with agent-specific subfolders:

```
work-orders/
├── wo_claude/
│   └── executed/
├── wo_codex/
│   └── executed/
└── wo_gemini/
    └── executed/
```

### A2. Initialize Core Documents

**source_of_truth.md** -- Read the project codebase first, then populate:
- Development Lifecycle (the four-stage pipeline)
- Workspace Rules (copy from Operating Rules below)
- File Naming Convention: `{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}`
- Workflow definitions for each artifact type
- Dev Folder Structure tree
- Project-Specific section: tech stack, origin, project structure, decisions log

**context_capsule.md** -- Initialize with:
- Active Task: (none) / idle
- In-Progress Notes: (no active work)
- Critical Rules: Copy the 8 workspace rules
- Last Session: Today's date, "Dev folder scaffolded from template"

**checkpoint.md** -- Initialize with:
- Milestone 1: "Dev folder scaffolded from template" / today's date / Done
- Current Phase: Setup

### A3. Provider Config Integration

**Praxis does NOT control how provider config files are created.** Providers should create their configs per their own recommendations (e.g., CLAUDE.md for Claude Code, AGENTS.md for Codex) in a **separate session before** running the Praxis init. The Praxis init then **injects** a context handoff section into the provider's existing config file -- augmenting it, never replacing it.

**If the provider config file does not exist when the Praxis init runs, STOP.** Instruct the user to run the native provider init first, then run the Praxis init again. This two-step flow ensures the provider gets full attention for its native setup without Praxis instructions competing for context.

Inject the following block into the provider's existing config file:

```markdown
## Context Handoff (Praxis)

- **Read order (every session):**
  1. `dev/source_of_truth.md` (canonical state)
  2. `dev/context_capsule.md` (live handoff)
  3. `dev/checkpoint.md` (progress milestones)
  4. Latest WO in `dev/work-orders/`
- **Write order (end of session):**
  1. Update `dev/source_of_truth.md` for new decisions
  2. Update `dev/context_capsule.md` (brief status + next steps)
  3. Update `dev/checkpoint.md` for completed milestones
```

### A4. Architecture Audit

If the project has existing code (not a greenfield), perform an initial codebase assessment:

1. Read the project structure, configs, dependencies, and key source files
2. Create an audit report in `dev/audit/current/` using this format:

```markdown
# Architecture Audit: [Project Name]

## Executive Summary
**Verdict:** PASS | CONDITIONAL PASS | FAIL
**Confidence:** High | Medium | Low
[2-3 sentence assessment]

## Component Verdicts

| Component | Verdict | Confidence | Notes |
|-----------|---------|------------|-------|
| [component] | KEEP / CHANGE / REMOVE | High/Med/Low | [rationale] |

## Risk Register

| Risk | Impact | Likelihood | Detection | Mitigation |
|------|--------|------------|-----------|------------|
| [risk] | High/Med/Low | High/Med/Low | [signal] | [action] |

## Work Orders to Create
- [ ] WO: [description] -- Priority: [High/Med/Low]
```

### A5. Create First Work Orders (Batch 0 Only)

**Only create Batch 0 (Critical) work orders during init.** These are security vulnerabilities, broken builds, and data loss risks. Everything else stays in the master plan draft and gets decomposed into WOs later.

Write WOs to `dev/work-orders/` (Solo mode) or `dev/work-orders/wo_claude/` (Triangle mode):

```markdown
# Work Order: [Description]

- **WO#:** [number]
- **Date Created:** YYYY-MM-DD
- **Status:** Pending
- **Assigned To:** [agent or "unassigned"]
- **Priority:** Critical
- **Batch:** 0

## Description
[What needs to be done and why]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Notes
[Additional context]
```

If no critical issues are found, skip WO creation. Non-critical findings go into the master plan draft.

### A6. Report Initialization Complete

Print a summary:
- Folder structure created
- Core documents initialized
- Provider config updated (context handoff injected)
- Audit performed (if applicable)
- Critical work orders created (if any)
- What needs admin review

---

## MODE B: Existing Project Conformance

### B1. Read Context Chain

Read these files in order:
1. `dev/source_of_truth.md` -- canonical rules and decisions
2. `dev/context_capsule.md` -- last session state
3. `dev/checkpoint.md` -- completed milestones
4. Latest pending WO in `dev/work-orders/`

### B2. Structural Conformance Check

**If `.praxis/praxis-lint.sh` exists**, run it as the automated conformance check:

```bash
bash .praxis/praxis-lint.sh
```

The linter checks all 7 categories (structure, freshness, work orders, naming, security, SOT consistency, orphans) and reports findings. Use `--fix` to auto-create missing directories. Use `--json` for structured output.

**If the linter is not available**, manually verify:

| Check | Expected |
|-------|----------|
| Core docs exist | source_of_truth.md, context_capsule.md, checkpoint.md |
| Research structure | research/{active,archive}/ |
| Planning structure | planning/master-plan/{draft,approved}/ |
| Work orders structure | work-orders/{executed}/ (Solo) or work-orders/wo_{agent}/{executed}/ (Triangle) |
| Commands structure | commands/active/, commands/executed/ |
| Audit structure | audit/{current,legacy}/ |
| Reports structure | reports/draft/{html,written}/, reports/published/{html,written}/ |
| Design structure | design/{audit/screenshots,language,resources}/ (language/ covers tokens + storybook docs) |
| Archive exists | archive/ |
| Naming convention | All files match `{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}` |
| No stale WOs | Check if any pending WOs are outdated or abandoned |

Report any missing directories or non-conforming files.

### B3. Architecture Audit (if stale)

If no audit exists in `dev/audit/current/` or the most recent audit is more than 2 weeks old, perform a fresh architecture audit using the format in A4.

### B4. Agent Conformance

Check if existing AI agent configurations follow the methodology:
- Do agent instructions reference the context chain (SOT --> capsule --> checkpoint)?
- Do they follow the session end protocol (update capsule, checkpoint)?
- Do they use work orders for task tracking?
- Do they respect the draft/published separation?

If not, create conformance work orders to update agent instructions.

### B5. Update Context Documents

- Update `context_capsule.md` with current session state
- Add a checkpoint milestone: "Praxis conformance audit performed"
- Note any structural fixes made

---

## Operating Rules (Always Active)

1. **Non-destructive** -- Never SSH to production servers. Local copies only.
2. **Self-contained projects** -- Every project gets its own `dev/` folder.
3. **No files at workspace root** -- All output goes into project folders or dev structure.
4. **Draft/published wall** -- AI writes to `draft/` only. Admin promotes to `published/`.
5. **Items move to `executed/` only when complete** -- Pending items stay in parent folder.
6. **File naming:** `{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}` -- Number 0 = READMEs/examples.
7. **Admin runs commands** -- AI writes commands to `dev/commands/active/`, admin executes them.
8. **Context docs updated every session end** -- source_of_truth (decisions), capsule (summary), checkpoint (milestones).

## Provider Integration Rule

The dev/ methodology does NOT control how provider config files (CLAUDE.md, etc.) are created. Providers should create their configs per their own recommendations. The dev init process then **injects** the context handoff section into the provider's existing config file -- augmenting it, never replacing it.

## Session End Protocol

Before ending any session, update:

1. **source_of_truth.md** -- Add any new decisions to the Decisions Log
2. **context_capsule.md** -- Write: date, what was done, what's next, active task status
3. **checkpoint.md** -- Add milestones for completed work

---

*Praxis v1.1 -- A filesystem-based AI development methodology.*
*Created by Luis Faxas, 2026.*
