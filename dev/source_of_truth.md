# Source of Truth

Canonical reference for project decisions, standards, and facts that do not change between sessions. This file is the template -- when copied into a new project, fill in the Project-Specific sections and keep the Workspace Rules as-is.

## Development Lifecycle

The dev/ folder is organized around a four-stage development pipeline. Every folder maps to one of these stages:

```
Research  →  Planning  →  Execution  →  Reports
(gather)    (decide)     (build)       (communicate)
```

| Stage | Folder | Purpose |
|-------|--------|---------|
| Research | `dev/research/` | Gather information before making decisions |
| Planning | `dev/planning/` | Master plans, architectural decisions |
| Execution | `dev/work-orders/`, `dev/commands/` | Actionable tasks, operator scripts |
| Reports | `dev/reports/` | Communicate results to stakeholders |
| Cross-cutting | `dev/audit/`, `dev/design/`, `dev/archive/` | Quality trail, design assets, historical records |

## Workspace Rules

These rules apply to ALL projects across the workspace.

1. This workspace is **non-destructive** -- no SSH to company servers from here.
2. Project repos in `_PROJECTS/` are local copies only.
3. Only the admin (user) moves reports from `draft/` to `published/`.
4. Work orders live in `dev/work-orders/`; completed ones move to `executed/`.
5. **Every new project gets a fresh `dev/` folder** -- self-contained and deployable as-is.
6. **Never create files at the workspace root** -- all output goes into project folders or the dev structure.
7. **Items only move to `executed/` when complete** -- work orders, commands, and other trackable items stay in their parent folder while pending and only move to `executed/` once finished.
8. **Live project import flow:** Admin transfers project from server --> lands in `_PROJECTS/{project_name}/` --> AI scaffolds `dev/` folder and reviews. AI never SSH's -- admin runs the transfer commands.

## Provider Integration Rule

The dev/ methodology does NOT control how provider config files (CLAUDE.md, etc.) are created. Providers should create their configs per their own recommendations. The dev init process then **injects** the context handoff section into the provider's existing config file — augmenting it, never replacing it.

## File Naming Convention

All files use the format: `{number}_{YYYY-MM-DD}_{DESCRIPTION}.{ext}`

- **Number** -- Sequential, chronological (0, 1, 2, ...)
- **Date** -- Creation date in ISO format (YYYY-MM-DD)
- **Description** -- UPPERCASE, underscore-separated
- Number 0 is reserved for READMEs and examples in each folder

## Workflow

- **Research** --> `dev/research/active/` while informing decisions --> `archive/` when decision is made
- **Master plans** --> `dev/planning/master-plan/draft/` -- admin promotes to `approved/`
- **Work orders** --> `dev/work-orders/` while pending --> `executed/` when complete
- **Commands** --> `dev/commands/active/{topic}/` while pending --> `executed/` when complete
- **Audit entries** --> `dev/audit/current/` --> admin archives to `legacy/`
- **Reports** --> `dev/reports/draft/{html,written}` -- admin moves to `published/`, AI never touches published
- **Context docs** --> `context_capsule.md`, `checkpoint.md`, `source_of_truth.md` are living documents updated each session

## Dev Folder Structure

```
dev/
├── source_of_truth.md              # This file -- canonical rules
├── context_capsule.md              # Session state and continuity
├── checkpoint.md                   # Progress milestones
│
├── init/                           # Methodology reference docs
│   ├── PRAXIS_INIT.md           # Provider-agnostic init spec
│   ├── CLAUDE_INIT.md              # Claude Code-specific init
│   ├── CODEX_INIT.md               # Codex manager init (Triangle mode)
│   └── GEMINI_INIT.md              # Gemini researcher init (Triangle mode)
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
├── private/                        # Sensitive docs (GITIGNORED)
│
└── archive/                        # Historical records
    └── {date}_{description}/       # Dated archive batches with manifests
```

## Global Workspace Paths

| Document | Path |
|----------|------|
| Workspace CLAUDE.md | `<WORKSPACE_ROOT>/CLAUDE.md` |
| Template dev/ | `<WORKSPACE_ROOT>/praxis_stack/dev/` |
| HTML Report Template | `<WORKSPACE_ROOT>/praxis_stack/dev/reports/draft/html/0_2026-02-15_EXAMPLE_REPORT.html` |
| Projects Root | `<WORKSPACE_ROOT>/<PROJECTS_DIR>/` |

> Replace `<WORKSPACE_ROOT>` with your actual workspace path.

## Decisions Log

| # | Decision | Date | Rationale |
|---|----------|------|-----------|
| 1 | Use filesystem-based workflow (no database) | 2026-02-15 | Keep it simple, portable, and transparent |
| 2 | Separate work-order streams per AI assistant (Triangle mode) | 2026-02-15 | Clear ownership and audit trail |
| 3 | Every project gets its own dev/ folder | 2026-02-15 | Self-contained projects with independent tracking |
| 4 | No files at workspace root | 2026-02-15 | Stray file incident -- agents must write to project folders only |
| 5 | Items move to executed/ only when complete | 2026-02-15 | Command doc placed in executed/ before being run -- pending items stay in parent folder |
| 6 | Live project import via admin transfer (admin-only) | 2026-02-15 | AI cannot SSH -- admin transfers files, AI scaffolds dev/ and reviews |
| 7 | Dev folder is the session context source | 2026-02-15 | Each project opened independently -- dev/ context docs must be self-contained |
| 8 | Research is a peer folder, not inside reports | 2026-02-20 | Research flows upstream (gather before deciding), reports flow downstream (communicate after building) |
| 9 | Work orders promoted to dev/ root, out of planning/ | 2026-02-20 | WOs are execution artifacts consumed during the build stage, not planning artifacts |
| 10 | Commands use active/ with topic subfolders | 2026-02-20 | Complex command sets need grouping (SSH setup, deployment scripts, etc.) |
| 11 | Provider config injection, not template replacement | 2026-02-20 | Let providers create their configs per their recommendations, then inject context handoff |
| 12 | Init files stay in dev/ for self-containment | 2026-02-20 | dev/ must be deployable as-is without external dependencies |
| 13 | Solo mode is the default, Triangle mode is opt-in | 2026-02-20 | Most projects use one agent -- multi-agent scaffolding added only when needed |

---

## Project-Specific (fill in per project)

### Tech Stack

<!-- e.g. Next.js, React, TypeScript, PostgreSQL -->

### Origin

<!-- e.g. Server: user@server-ip, Remote Path: /path/to/project -->

### Project Structure

<!-- Tree of project-specific folders and key files -->

### Project Decisions

| # | Decision | Date | Rationale |
|---|----------|------|-----------|
