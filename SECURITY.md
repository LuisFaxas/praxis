# Security Model

This document describes the security boundaries, safe defaults, and known risks of the Praxis methodology and its MCP server (`praxis-mcp`).

**Version:** 1.3.1 | **Last Updated:** 2026-02-26

---

## 1. Scope

### What praxis-mcp touches

- **Filesystem reads/writes** under `dev/` and `.praxis/` within the project directory
- **Child process execution** — the `lint` tool shells out to `bash .praxis/praxis-lint.sh`
- **stdin/stdout** — MCP protocol communication with the host IDE or CLI

### What praxis-mcp does NOT touch

- **Network** — no HTTP requests, no API calls, no telemetry
- **Authentication** — no passwords, tokens, or secrets stored or transmitted
- **System configuration** — no environment variables modified, no PATH changes
- **Other processes** — no inter-process communication beyond MCP stdio

---

## 2. Path Safety

### Project directory sandboxing

All file operations are scoped to the project root (detected via `PRAXIS_PROJECT_DIR` env var or `process.cwd()`). The server operates exclusively within:

- `{project}/dev/` — work orders, context chain, research, planning
- `{project}/.praxis/` — linter script (read-only by MCP, write-only by `init`)

### Path traversal protection

- All paths are constructed using `node:path.join()` which normalizes `..` components
- No user-supplied path segments are passed directly to filesystem APIs without joining to the project root
- Symlink resolution is not performed — the server operates on the path as given

### Known limitation

The current version does not enforce a strict allowlist or reject `..` in user-supplied path parameters. This is acceptable because MCP servers run in the user's own process context with the user's own filesystem permissions. A future version (v1.4.0) will add explicit path sandboxing for defense-in-depth.

---

## 3. Safe Defaults

### Installation

- **Recommended:** `npm install praxis-mcp` (version locked in `package.json`)
- **Acceptable:** `npx praxis-mcp@1.1.0` (pinned version)
- **Not recommended:** `npx praxis-mcp` (unpinned — could pull a compromised version)

### Version pinning

All documentation and init files reference pinned versions. The `.mcp.json` configuration file locks the server to a specific installed version.

### No implicit execution

praxis-mcp never auto-runs scripts, installs dependencies, or modifies files outside its scope. All write operations are explicit tool calls that require the AI agent (or user) to invoke them.

---

## 4. Concurrency

### Single-writer rule

Praxis enforces a single-writer model through its folder structure:

- **Work orders** are partitioned by agent: `wo_claude/`, `wo_codex/`, `wo_gemini/`
- Each agent writes only to its own folder — no cross-agent writes
- **Context chain** (`context_capsule.md`, `checkpoint.md`) is updated by the session-closing agent only
- **Source of Truth** is updated by any agent but treated as append-only for decisions

### No file locking

The MCP server does not implement file locks. Concurrent access by multiple agents to the same file could cause data loss. The methodology prevents this through convention (agent-partitioned folders), not enforcement.

---

## 5. Known Ecosystem Risks

MCP security incidents are real and documented. The following table is maintained for awareness:

| Incident | Date | Impact |
|----------|------|--------|
| Invariant Labs tool poisoning | Sep 2025 | Demonstrated data exfiltration via hidden MCP instructions |
| Smithery path traversal | Oct 2025 | Docker credentials and Fly.io tokens leaked (~3,000 apps) |
| Anthropic Git MCP CVEs (3 CVEs) | Jan 2026 | Argument injection leading to RCE chain (CVSS 7.1-8.8) |
| mcp-remote RCE (CVE-2025-6514) | 2025 | CVSS 9.6, 437K+ downloads affected |

### How praxis-mcp mitigates these risks

- **No network access** — eliminates remote exfiltration vectors
- **No `exec()`** — the only child process call uses `execFile()` with a fixed command path (no shell injection)
- **No dynamic tool registration** — all 13 tools are statically registered at startup
- **No eval or template interpolation** — content is string-replaced, not evaluated

---

## 6. What's NOT Enforced Yet

The following security measures are planned for v1.4.0 but are **not yet implemented**:

| Feature | Status | Target |
|---------|--------|--------|
| Strict path allowlist (reject `..` traversal) | Planned | v1.4.0 |
| Shell injection hardening audit | Planned | v1.4.0 |
| Read-only mode for non-owner agents | Planned | v1.4.0 |
| npm provenance attestation | Planned | v1.4.0 |
| Lint-enforced security rules | Planned | v1.4.0 |

---

## Reporting

If you discover a security issue, please open a GitHub issue at:
https://github.com/LuisFaxas/praxis/issues

For sensitive reports, contact: admin@faxas.net
