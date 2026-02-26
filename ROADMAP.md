# Praxis Roadmap

> From inception to future — the evolution of a filesystem-based methodology for agentic AI development.

**Last Updated:** 2026-02-21
**Current Version:** v1.3.0 (methodology) | v1.0.0 (praxis-mcp on npm)

---

## Table of Contents

1. [Origin Story](#origin-story)
2. [Version History](#version-history)
3. [Current State (v1.3.0)](#current-state-v130)
4. [Independent Audit Findings](#independent-audit-findings)
5. [Future Roadmap](#future-roadmap)
   - [v1.4.0 — Hardening](#v140--hardening)
   - [v1.5.0 — Ecosystem Expansion](#v150--ecosystem-expansion)
   - [v2.0.0 — Next Generation](#v200--next-generation)
   - [v2.x — Long-Term Vision](#v2x--long-term-vision)
6. [Research Backlog](#research-backlog)
7. [Non-Goals](#non-goals)

---

## Origin Story

Praxis wasn't designed in a whiteboard session. It grew organically from years of building with AI — starting messy, getting organized, and eventually recognizing that the organizational patterns themselves were the product.

### The ChatGPT Era: Master Plans (2023-2024)

It started about a year into ChatGPT's release. The web interface was the only option — no CLI agents, no MCP, no tool use. Just a chat window and a developer trying to build real software through conversation.

The first problem was simple: **how do you keep a multi-week project coherent when the AI forgets everything every session?** The answer was the *master plan* — a manually written markdown document that laid out the entire project scope, phases, and decisions. Before every session, you'd paste context. After every session, you'd update the plan. It wasn't original (project plans exist everywhere), but it was a necessity for survival.

Prompting naturally evolved into something more structured. Describing tasks in conversational English was imprecise — "fix the login page" meant different things to the AI on different days. Those prompts became *work orders*: specific, acceptance-criteria-driven task descriptions that removed ambiguity. Again, not a new concept — construction and manufacturing have used work orders for decades — but the adaptation to AI-assisted development was practical innovation born from daily frustration.

### The CLI Migration: Organized Chaos (Late 2024 - Early 2025)

When CLI-based AI agents arrived, the game changed. Started with Windsurf (the first IDE-integrated agent that felt productive), graduated to Claude Code (terminal-native, full filesystem access), then added Codex (strong at planning and auditing). Suddenly there were multiple agents, multiple projects, and multiple sessions running simultaneously.

The result was chaos. Dozens of random `.md` files — plans, prompts, context docs, decision logs — scattered across project roots. Every repo had its own ad-hoc organization. Finding "what did we decide about the database schema?" meant grep-ing through 30 files with no naming convention.

### The Source of Truth (Early 2025)

The breakthrough was the *Source of Truth* document. One file. One canonical record of every decision, every constraint, every architectural choice. When the SOT said "ZFS only on mirror drives," that was law — no re-debating, no drift. Both the developer and the AI could read one file and be on the same page.

But one file wasn't enough. The SOT captured *decisions* — it didn't capture *session state* (what happened last time, what's next, what's blocked). The context capsule was born: a lightweight handoff document that any agent could read in seconds to know exactly where the project stood. Then the checkpoint document for milestone tracking. Three files, a hierarchy of context. Redundant? Maybe. But better redundant than making mistakes — and the supporting docs consumed far fewer tokens than re-explaining everything from scratch.

### The Pipeline (2025)

With context solved, the rest fell into place logically:

- **Master plans** became the planning stage — structured documents in `dev/planning/` with draft and approved states
- **Work orders** became the execution stage — acceptance-criteria-driven tasks with a clear pending → executed lifecycle
- **Reporting** was the surprise discovery. With good guardrails, AI agents could create beautiful, professional HTML reports. Benchmark results, architecture diagrams, progress summaries — all rendered with consistent styling. This saved developers and stakeholders hundreds of hours of communication overhead. Reports became a first-class output, not an afterthought, with both written (markdown) and visual (HTML) formats
- **Auditing** was the natural progression. After building, you need a place to consolidate findings, critique your own work, and track quality over time. The `dev/audit/` folder completed the pipeline

The four-stage pipeline — Research → Planning → Execution → Reports — wasn't designed top-down. It was extracted from months of actual practice. Every stage exists because its absence caused real pain.

### The `dev/` Folder (2025)

All of these files needed a home that wasn't the project root. The `dev/` folder was the solution: one directory that collapses in any file explorer, stays invisible to the application code, and contains the entire methodology. Elegant. Doesn't take up cognitive space. Doesn't pollute the codebase.

### From Practice to Product (Feb 2026)

By early 2026, the same patterns had been independently reinvented across three different projects. That was the signal — these weren't project-specific hacks, they were a *methodology*. Praxis was extracted, formalized, and released as an open-source framework with enforcement tooling (the linter) and automation (the MCP server).

The name comes from the Greek *praxis (πρᾶξis)* — "the practice of doing." Aristotle distinguished *praxis* (informed action) from *theoria* (contemplation) and *poiesis* (making). Praxis bridges theory and practice — it doesn't just describe how work should be done, it enforces it through tooling. The methodology was literally born from practice, not theory.

---

## Version History

### v0.x — Pre-Release Evolution (2023-2025)

Before Praxis had a name, its components evolved independently across multiple projects.

**Timeline:**

| Period | What Emerged | Trigger |
|--------|-------------|---------|
| ~2023 | Master plans (manually written markdown) | ChatGPT web interface, multi-week projects losing context |
| ~2024 | Work orders (acceptance criteria, structured tasks) | Conversational prompts too imprecise for complex execution |
| Late 2024 | CLI agent migration (Windsurf → Claude Code → Codex) | IDE and terminal agents replaced web interface workflows |
| Early 2025 | Source of Truth document | Decision drift across sessions — needed one canonical record |
| Mid 2025 | Context chain (SOT + capsule + checkpoint) | One doc wasn't enough — session state and milestones needed their own files |
| Mid 2025 | Four-stage pipeline (Research → Reports) | Organic: planning → execution → reporting → auditing fell into place from practice |
| Mid 2025 | `dev/` folder convention | Root directory chaos — dozens of ad-hoc .md files across repos |
| Late 2025 | HTML reporting as first-class output | Discovered agents create excellent visual reports with guardrails; stakeholder communication transformed |
| Late 2025 | Multi-agent roles (Triangle mode) | Running Claude Code + Codex + Gemini simultaneously required role separation |

These patterns were independently reinvented across three projects before being recognized as a coherent methodology. Praxis v1.1 was the extraction and formalization of two years of organic evolution.

### v1.1.0 — Foundation (Feb 2026)

**Release:** Initial public release
**Theme:** The filesystem contract — two years of organic practice formalized into a spec

This was the extraction release. Everything that had been independently reinvented across projects was codified into a single, portable methodology:

- **Context chain:** `source_of_truth.md` + `context_capsule.md` + `checkpoint.md` — the three-file hierarchy of context that evolved from the original single SOT document
- **Work orders:** The structured task format that replaced conversational prompting, now with formal acceptance criteria and a pending → executed lifecycle
- **Four-stage pipeline:** Research → Planning → Execution → Reports — the organic workflow captured as an explicit specification
- **Provider init system:** `PRAXIS_INIT.md` (universal) + provider-specific init files (`CLAUDE_INIT.md`, `CODEX_INIT.md`, `GEMINI_INIT.md`) — so agents from different providers all boot into the same methodology
- **Adoption tiers:** Lite (context chain only) → Standard (full pipeline) → Enterprise (multi-agent orchestration) — recognizing that not every project needs the full system
- **Operating modes:** Solo (one agent) → Triangle (planner + worker + researcher) — formalizing the multi-agent roles that emerged from running Claude Code + Codex + Gemini simultaneously. Triangle is the default multi-agent topology, but role orchestration can also run with same-provider parallel sessions or larger N-agent graphs under guardrails.
- **`dev/` folder hierarchy:** The directory convention that replaced root-level file chaos, now with complete naming conventions and structure specification
- **HTML reporting:** Written (markdown) and visual (HTML) report outputs as a first-class stage — born from the discovery that agents with guardrails produce stakeholder-ready documents

### v1.2.0 — Validation (Feb 2026)

**Release:** Added enforcement layer
**Theme:** Trust but verify

A methodology is only as good as its enforcement. Agents skip steps, forget conventions, and drift from the spec over time. The v0.x era relied on human vigilance to catch violations — which meant they were caught late or not at all.

Introduced `praxis-lint` — a bash-based validation tool:

- **50 checks across 7 categories:** structure, naming, freshness, security, SOT consistency, orphan detection, work order validation
- **JSON output** for CI/CD integration and programmatic consumption
- **Flags:** `--strict`, `--fix`, `--json`, `--quiet`, `--skip-security`, `--skip-freshness`
- **Pre-commit hook support** via standard git hooks

This version transformed Praxis from "conventions you follow" to "conventions that are enforced." The linter catches what humans and agents miss: stale context docs, orphaned work orders, secrets in tracked files, naming convention violations.

### v1.3.0 — Automation (Feb 2026)

**Release:** Added MCP server
**Theme:** Methodology as a service

The v1.1 methodology required agents to *read instructions about* the filesystem contract. The v1.3 MCP server turns the contract into *tools agents call natively*. Instead of reading a doc that says "update the context capsule at session end," the agent calls `mcp__praxis__update_capsule` and the methodology enforces the format automatically.

Introduced `praxis-mcp` — a TypeScript MCP server with 12 tools:

- **Session lifecycle (3):** `session_start`, `session_end`, `detect_project`
- **Context chain (3):** `read_context`, `update_capsule`, `update_checkpoint`
- **Work orders (4):** `list_work_orders`, `read_work_order`, `create_work_order`, `complete_work_order`
- **Validation (1):** `lint`
- **Scaffolding (1):** `scaffold`

Design principles:
- **Stateless:** No in-memory state between tool calls. The filesystem IS the state — consistent with the methodology's core philosophy since the ChatGPT era.
- **Zero unnecessary dependencies:** Only MCP SDK + Zod (required by the protocol).
- **Provider-agnostic:** `*_INIT.md` globs, `wo_*/` patterns — no hardcoded provider names.

Published to npm as `praxis-mcp` (v1.0.0). Registered via `.mcp.json` (Claude Code) and `config.toml` (Codex).

**First production deployment:** faxas.net portfolio app (Next.js 15, Triangle mode with Claude Code + Codex + Gemini).

### v1.3.1 — Hardening (Feb 2026)

**Release:** Upstream from portfolio pilot + MCP v1.1.0
**Theme:** Battle-tested features from production to official

The portfolio app served as a pilot for lane-based subproject organization, patch work orders, and centralized completion. After validating these patterns across 56 WOs and 4 lanes, the proven features were upstreamed to the official methodology and MCP server.

**Methodology changes:**

- **WO Lane System:** Organize work orders into typed subproject lanes (`{nn}_{type}_{scope}`). Four lane types: delivery, program, lab, ops. Program and lab lanes have relaxed validation.
- **Centralized Completion:** Completed lane WOs move to `wo_{agent}/_executed/{lane}/` for a clean audit trail.
- **Patch Work Orders:** `_P{NN}` suffix convention with parent metadata (Parent WO, Patch, Sequence Key).
- **N/A Criteria:** `- [ ] ~~text~~ N/A — reason` format with 3 guardrails (reason required, max 3 per WO, prefer rewrite in active WOs).

**praxis-mcp v1.1.0 (13 tools):**

- Lane-aware scanning on all WO tools (list, read, create, complete)
- New `create_patch_work_order` tool (12 → 13 tools)
- N/A criteria treated as resolved in `complete_work_order`
- `discoverLanes()` and `resolveExecutedDir()` reusable helpers
- `_executed/` naming preference with `executed/` fallback
- Lane scaffolding support in `scaffold` tool
- `npx praxis-mcp init` CLI command for one-command scaffolding
- `--version` flag support

**praxis-lint v1.3.1:**

- Upstreamed from pilot (1,021 → 1,356 lines)
- Lane scanning with type-specific validation
- Patch WO validation (parent exists, sequence integrity)
- N/A criteria recognition (WO-012, WO-013)
- Superseded WO handling
- Line 442 bug fix (`unchecked` variable safety)

**New documentation:**

- [SECURITY.md](SECURITY.md) — security model for praxis-mcp (scope, path safety, concurrency, known ecosystem risks)

### Evolution Summary

| Year | What Changed | How Work Was Done |
|------|-------------|-------------------|
| 2023 | ChatGPT web interface | Copy-paste context every session, manually track everything |
| 2024 | CLI agents arrive | Better tools, but fragmented docs scattered across repos |
| Early 2025 | SOT + context chain | Structured context, deterministic boot sequences |
| Mid 2025 | Full pipeline + `dev/` folder | Complete methodology, but enforced only by convention |
| Feb 2026 (v1.1) | Public release | Methodology formalized, portable across projects |
| Feb 2026 (v1.2) | praxis-lint | Convention enforcement automated (50 checks) |
| Feb 2026 (v1.3) | praxis-mcp on npm | Methodology becomes callable tools — agents use it natively |
| Feb 2026 (v1.3.1) | Hardening release | Lanes, patches, N/A criteria, CLI init, security model — battle-tested from pilot |

---

## Current State (v1.3.1)

### What Works

| Layer | Component | Status |
|-------|-----------|--------|
| Methodology | Context chain (SOT + capsule + checkpoint) | Stable, battle-tested |
| Methodology | Work order lifecycle (pending → executed) | Stable |
| Methodology | WO Lane System (delivery/program/lab/ops) | New in v1.3.1, production-validated |
| Methodology | Patch work orders (_P{NN} suffix) | New in v1.3.1, production-validated |
| Methodology | N/A criteria (3 guardrails) | New in v1.3.1 |
| Methodology | Four-stage pipeline (Research → Reports) | Stable |
| Methodology | Provider init system (4 providers) | Stable |
| Methodology | Adoption tiers (Lite / Standard / Enterprise) | Stable |
| Methodology | Operating modes (Solo / Triangle as default topology) | Stable |
| Enforcement | praxis-lint.sh (50+ checks, 7 categories) | Stable, v1.3.1 (1,356 lines) |
| Automation | praxis-mcp (13 tools, 5 categories) | Stable, v1.1.0 published to npm |
| Automation | CLI init (`npx praxis-mcp init`) | New in v1.3.1 |
| Security | SECURITY.md (threat model) | New in v1.3.1 |
| Integration | Claude Code (.mcp.json) | Verified, production use |
| Integration | Codex (config.toml) | Verified, MCP connected |
| Integration | Gemini (init docs only, no MCP) | Documented |
| Distribution | npm (`praxis-mcp@1.1.0`) | Published, installable |

### What's Missing

| Gap | Impact | Notes |
|-----|--------|-------|
| End-to-end example repo | High | Portfolio app is the reference implementation but not documented as such |
| Concurrency conventions | Medium | Needs explicit guidance for same-provider parallel sessions and >3 agent graphs writing to shared files |
| Cross-platform linting | Low | praxis-lint.sh requires bash (WSL on Windows); Node.js port planned for v1.4.0 |
| CHANGELOG.md | Low | Version history only in git tags and ROADMAP.md |
| Cursor/Windsurf init docs | Medium | Only Claude, Codex, Gemini supported |

### Production Deployments

| Project | Tier | Mode | Agents | Status |
|---------|------|------|--------|--------|
| faxas.net Portfolio | Standard | Triangle | Claude Code + Codex + Gemini | Active (WO#2-7 in progress) |
| Praxis Repo (self-hosted) | Lite | Solo | Claude Code | Dogfooding |

---

## Independent Audit Findings

In February 2026, an independent audit was conducted using GPT Pro (OpenAI o1-pro), followed by point-by-point verification with web research. The findings below represent the verified consensus.

### Confirmed Strengths

1. **Session continuity is the core value proposition** — the context chain + work orders pattern solves a real, documented problem (agent amnesia). No other open-source tool combines filesystem spec + linter + MCP server into one package.

2. **Originality is in the coupling, not individual concepts** — tickets, checklists, handoff docs aren't new. The tight coupling of filesystem spec + linter + MCP server is the differentiator. This creates a *mechanism* (tooling + validation), not just a *policy*.

3. **`session_start` is pragmatically excellent** — returning the full context chain + pending work orders in one tool call aligns with how agents actually fail in practice (skipping files, mis-ordering reads, forgetting context).

4. **Provider-agnostic architecture is verified** — no hardcoded provider names anywhere in praxis-lint or praxis-mcp. Init files use `*_INIT.md` glob patterns.

### Confirmed Risks

#### 1. MCP Security (HIGH PRIORITY)

MCP security is not theoretical. Documented incidents as of February 2026:

| Incident | Date | Impact |
|----------|------|--------|
| postmark-mcp (malicious npm package) | Sep 2025 | 1,643 downloads; emails exfiltrated to attacker |
| Asana MCP cross-tenant data leak | Jun 2025 | Customer data bled across MCP instances |
| Smithery path traversal | Oct 2025 | Docker creds + Fly.io token leaked (~3,000 apps) |
| Anthropic Git MCP CVEs (3 CVEs) | Jan 2026 | Argument injection → RCE chain (CVSS 7.1-8.8) |
| mcp-remote RCE (CVE-2025-6514) | 2025 | CVSS 9.6, 437K+ downloads affected |

**Praxis-specific mitigations needed:**
- Strict path allowlists (operate only under `$PRAXIS_PROJECT_DIR/dev` and `$PRAXIS_PROJECT_DIR/.praxis`)
- Reject `..`, symlinks escaping root, Unicode path tricks
- Never pass untrusted strings into shell (especially for lint spawning)
- Document "what the server will never do"

#### 2. Supply Chain Risk (MEDIUM PRIORITY)

`npx praxis-mcp` downloads and executes the latest version every run. The postmark-mcp case proves the threat model: attacker publishes clean versions, then injects malicious code.

**Mitigations:** Pin versions in all documentation (`npx praxis-mcp@1.0.0`), elevate build-from-source as a first-class option for security-conscious users.

#### 3. Naming & Discoverability (MEDIUM PRIORITY)

"Praxis" in the AI space is populated:

| Project | Overlap |
|---------|---------|
| google/praxis | Google's JAX ML library |
| praxis-sol/Praxis | Python agent framework ("FastAPI for GenAI") |
| Praxis-AI.com | Digital twin MCP platform, featured on Claude's customer page |
| prxs-ai | Decentralized AI agent mesh |

`praxis-mcp` on npm has no technical conflict (name is clear). The risk is search invisibility — `LuisFaxas/praxis` does not appear in any "praxis AI" search results currently. This requires deliberate SEO and community presence, not a rename.

#### 4. Concurrency (LOW-MEDIUM PRIORITY)

Multi-agent file conflicts are a documented production problem. The industry consensus solution is git worktrees (each agent gets an isolated branch), not file locking. Praxis's work-order-based task decomposition naturally partitions work, but shared files (`source_of_truth.md`, `context_capsule.md`) need a single-writer convention.

### Audit Claims Debunked

| Claim | Reality |
|-------|---------|
| "CLAUDE.local.md is deprecated" | Not deprecated. Anthropic confirmed it's fully supported. Docs had a transient error. |
| "axispraxis is a competitor" | It's a variable fonts typography tool. Likely an audit hallucination. |
| "managed-settings.json is relevant" | Enterprise IT admin tooling only. Not useful for open-source authors. |
| "Rust docs.rs/praxis is competition" | Different ecosystem entirely. Praxis users are npm/TypeScript. |

---

## Future Roadmap

### v1.4.0 — Deep Hardening

**Theme:** Enforcement, cross-platform, and trust
**Priority:** HIGH — completes the hardening arc started in v1.3.1
**Target:** Q2 2026

#### Deliverables

| # | Item | Description |
|---|------|-------------|
| 1 | **Path sandboxing** | Strict allowlist in praxis-mcp: only operate under `$PRAXIS_PROJECT_DIR/dev` and `.praxis/` by default. Reject path traversal, symlink escape, and Unicode tricks |
| 2 | **Shell injection hardening** | Audit and harden the `lint` tool's `child_process.execFile` call. Never pass unsanitized strings to shell |
| 3 | **Node.js linter port** | Rewrite praxis-lint.sh (1,356 lines of bash) in TypeScript. Eliminates bash dependency, enables cross-platform support (Windows without WSL), and allows deeper integration with the MCP server |
| 4 | **CHANGELOG.md** | Formal changelog following Keep a Changelog format, covering v1.1 → v1.3.1 retroactively |
| 5 | **npm provenance attestation** | Enable npm provenance on publish for supply chain transparency |
| 6 | **Lint-enforced security rules** | Add security-focused lint checks: detect secrets in WOs, validate path references, flag unsafe command patterns |

#### What shipped in v1.3.1

The following items were originally planned for v1.4.0 but were pulled forward as lightweight gap-fills:
- ~~SECURITY.md~~ — Shipped in v1.3.1
- ~~Version pinning in docs~~ — All examples now pin to `@1.1.0`
- ~~CLI installer~~ — `npx praxis-mcp init` shipped in v1.3.1
- ~~Concurrency convention~~ — Documented in SECURITY.md single-writer rule

---

### v1.5.0 — Ecosystem Expansion

**Theme:** Meet developers where they are
**Priority:** MEDIUM — broadens adoption surface
**Target:** Q2 2026

#### Deliverables

| # | Item | Description |
|---|------|-------------|
| 1 | **Cursor init doc** | `CURSOR_INIT.md` — Cursor's `.cursor/rules/` system + MCP integration |
| 2 | **Windsurf init doc** | `WINDSURF_INIT.md` — Windsurf's Cascade AI + MCP integration |
| 3 | **GitHub MCP Registry listing** | Register `praxis-mcp` in the official MCP Registry at `registry.modelcontextprotocol.io` |
| 4 | **Reference implementation** | Document the faxas.net portfolio app as an official end-to-end example: session start → create WO → execute → complete → checkpoint → lint → session end |
| 5 | **Quick-start guide** | 5-minute getting started guide: `npx praxis-mcp`, scaffold, first work order, first lint |
| 6 | **`.claude/rules/` integration** | Explore Claude Code's new modular rules directory (`paths:` scoping via YAML frontmatter) as an alternative to monolithic CLAUDE.md injection |
| 7 | **AGENTS.md alignment** | Evaluate the emerging cross-provider `AGENTS.md` standard and ensure Praxis init docs are compatible |

#### Why This Order

Cursor and Windsurf together represent a significant share of AI-assisted development. The GitHub MCP Registry is becoming the discovery mechanism for MCP servers. A reference implementation converts "interesting idea" into "I can see how to use this."

---

### v2.0.0 — Next Generation

**Theme:** Structural improvements that justify a major version
**Priority:** HIGH for long-term — builds on v1.x stability
**Target:** Q3-Q4 2026

#### Deliverables

| # | Item | Description |
|---|------|-------------|
| 1 | **YAML frontmatter in work orders** | Optional structured frontmatter (`status`, `priority`, `assigned_to`, `criteria`) replacing regex-parsed markdown headers. Backward-compatible — parsers fall back to current regex if no frontmatter present |
| 2 | **Cross-platform linting (Node.js)** | Port praxis-lint from bash to TypeScript. Ship as part of the `praxis-mcp` package with a `praxis-mcp lint` CLI command. Bash version remains as `praxis-lint-legacy.sh` |
| 3 | **Capability modules (architecture)** | Extensible module system for project-type-specific checks. Auto-detection based on project signals (presence of `.storybook/`, CSS framework, ORM config, CI/CD files). Core Praxis stays lean; capabilities activate per project. Escape hatch: manual `praxis.config.json` override |
| 4 | **Visual QA module** | First capability module. Integrates Playwright (CLI or MCP) for end-of-session UI verification on frontend projects. Activates when Storybook, CSS framework, or frontend framework config detected. Strategic, not wasteful — targeted pass on affected pages/stories at session end |
| 5 | **Workspace-level MCP** | Support multi-project workspaces (monorepos) where one MCP server governs multiple `dev/` roots. New `detect_workspace` tool for mapping projects |

#### Breaking Changes (v2.0)

- Work order parsers will prefer YAML frontmatter when present (backward-compatible, but new WOs default to frontmatter format)
- `lint` tool will use the TypeScript implementation by default (bash version available as fallback)
- New `praxis.config.json` at project root for module configuration (optional — zero-config default still works)

#### Why a Major Version

YAML frontmatter changes the document contract. The module system changes how detection works. These are foundational shifts that warrant a clean version boundary while maintaining backward compatibility.

---

### v2.x — Long-Term Vision

**Theme:** From methodology to platform (carefully)
**Priority:** Speculative — driven by real usage data
**Target:** 2027+

#### Potential Additions (Research Required)

| # | Item | Description | Prerequisite |
|---|------|-------------|--------------|
| 1 | **Database migration module** | Capability module for ORM-heavy projects. Validates migration files, checks schema drift, gates work order completion on clean migrations | v2.0 module system |
| 2 | **CI/CD module** | Capability module for deployment-aware projects. Pre-deploy checklist, deployment verification, rollback documentation | v2.0 module system |
| 3 | **Governance constitution** | GitHub Spec-Kit-style constitutional rules that actively block non-compliant plans at the planning phase (complementary to context injection) | Research: Spec-Kit patterns |
| 4 | **GitHub Issues bridge** | Optional bi-directional sync: GitHub Issues → work orders, work order completion → issue close. Configurable, not required | Demand from adopters |
| 5 | **Praxis CLI** | Standalone CLI (`npx praxis init`, `praxis wo create`, `praxis lint`, `praxis status`) for human operators, separate from the MCP server for AI agents | npm package restructure |
| 6 | **Session analytics** | Opt-in telemetry: session duration, tool call frequency, lint violation trends. Local-only (JSON files in `dev/private/`), never phoned home | Privacy-first design |
| 7 | **Multi-repo orchestration** | Cross-repository work orders and context chains for teams running multiple services with shared dependencies | v2.0 workspace support |

#### Explicit Non-Goals for v2.x

These are features that will NOT be built even in the long term, to prevent scope creep:

- **SaaS dashboard** — Praxis is filesystem-first. A web UI contradicts the core philosophy.
- **Real-time collaboration** — Agents don't need real-time sync. Git + worktrees handle concurrency.
- **Model-specific adapters** — Praxis is provider-agnostic by design. It governs how agents work, not which model they use. Custom/private LLMs can participate when they follow the same filesystem contract.

---

## Research Backlog

Items under active investigation that may influence future versions.

### Playwright Visual QA Experiment (Active)

**Status:** Testing during portfolio build (WO#2-WO#7)
**Hypothesis:** Playwright (MCP or CLI) can provide meaningful visual verification for UI components without excessive token cost.
**Approach:** Side-by-side comparison of Playwright MCP (v0.0.68) vs Playwright CLI in the portfolio project. Tracking token usage, false positives, and "was this actually useful?" per session.
**Decision gate:** Results after WO#7 completion determine whether to formalize as a v2.0 capability module.

**Key findings so far:**
- Playwright MCP is v0.0.68 (pre-1.0, weekly breaking changes — version pinning mandatory)
- Default mode uses accessibility tree, not screenshots (fast and token-efficient, but not truly "visual")
- Playwright CLI is 4x more token-efficient for agents with shell access (writes to disk, not context window)
- Full interaction capabilities beyond screenshots: navigation, form filling, JS execution, multi-tab

### GitHub Spec-Kit Constitutional Governance

**Status:** Monitoring
**What it is:** GitHub's experimental framework for spec-driven AI development. Stores principles at `.specify/memory/constitution.md` with nine governing articles. The `/speckit.plan` command validates plans against constitutional rules before execution.
**Relevance:** Complementary to Praxis — Spec-Kit gates at the planning phase, Praxis governs execution. Could inform a v2.x governance constitution feature.

### AGENTS.md Cross-Provider Standard

**Status:** Monitoring
**What it is:** Emerging industry standard for cross-provider agent instruction files. Backed by the Linux Foundation's Agentic AI Foundation (AAIF).
**Relevance:** If AGENTS.md becomes the standard, Praxis init files should be compatible or generate AGENTS.md-compliant output.

### MCP OAuth 2.1 for STDIO Transport

**Status:** Watching MCP spec evolution
**What it is:** OAuth 2.1 is now standard for HTTP-transport MCP servers, but STDIO-transport (used by praxis-mcp) has no auth layer. The spec says STDIO should "limit access to just the MCP client."
**Relevance:** If STDIO auth is standardized, praxis-mcp should adopt it. Currently low priority because STDIO servers run locally.

---

## Non-Goals

Things Praxis will never be, to keep the project focused:

| Non-Goal | Why |
|----------|-----|
| A project management tool | Praxis governs how AI agents work, not how humans manage projects. Jira/Linear/GitHub Projects handle that. |
| A prompt library | Praxis is structural (files + tools), not textual (prompt templates). Init docs teach methodology, not prompt engineering. |
| A model-specific framework | Provider-agnostic is a core principle. Praxis never recommends or requires a specific LLM. |
| A SaaS product | The filesystem is the state. A web dashboard would contradict the core philosophy. |
| A real-time collaboration tool | Agents work asynchronously via work orders. Git handles concurrency. Real-time sync is unnecessary. |
| A replacement for version control | Praxis complements git, never replaces it. Work orders track intent; git tracks changes. |

---

## Contributing

Praxis is currently maintained by a single developer. Contributions are welcome for:

- New provider init docs (Cursor, Windsurf, Copilot, etc.)
- praxis-lint rule improvements
- praxis-mcp tool enhancements
- Documentation and examples
- Security audits and hardening

See the [README](README.md) for setup instructions. File issues at [github.com/LuisFaxas/praxis](https://github.com/LuisFaxas/praxis).

---

*"Between the idea and the reality falls the shadow." — T.S. Eliot*

*Praxis exists to eliminate that shadow for AI agents.*
