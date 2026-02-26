# Praxis MCP Server

[![npm](https://img.shields.io/npm/v/praxis-mcp?style=flat-square&color=fe5000)](https://www.npmjs.com/package/praxis-mcp)
[![License](https://img.shields.io/badge/license-MIT-667eea?style=flat-square)](../LICENSE)

MCP (Model Context Protocol) server for the [Praxis](https://github.com/LuisFaxas/praxis) AI development methodology. Gives any MCP-compatible AI agent structured tools for session management, work order lifecycle, context chain operations, validation, and project scaffolding.

## Install

```bash
npm install praxis-mcp
```

## Quick Start

### CLI Init (New Projects)

```bash
npx praxis-mcp init --path /path/to/project              # starter tier (default)
npx praxis-mcp init --path /path/to/project --tier full   # full tier with all folders
npx praxis-mcp init --tier standard --mode triangle       # multi-agent mode
```

### Register with Claude Code

Add to `.mcp.json` at your project root:

```json
{
  "mcpServers": {
    "praxis": {
      "command": "npx",
      "args": ["praxis-mcp"],
      "env": {
        "PRAXIS_PROJECT_DIR": "/path/to/your/project"
      }
    }
  }
}
```

### Register with Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.praxis]
command = "npx"
args = ["praxis-mcp"]

[mcp_servers.praxis.env]
PRAXIS_PROJECT_DIR = "/path/to/your/project"
```

Restart your AI tool. Tools appear as `mcp__praxis__session_start`, `mcp__praxis__create_work_order`, `mcp__praxis__lint`, etc.

### Build from Source (Contributors)

```bash
git clone https://github.com/LuisFaxas/praxis.git
cd praxis/praxis-mcp && npm install && npm run build
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Tools (13)

All tools are prefixed as `mcp__praxis__<tool>` by the MCP protocol.

### Session Lifecycle

| Tool | Description |
|------|-------------|
| `session_start` | Read the full context chain + pending work orders in canonical Praxis order. Lane-aware: discovers WOs inside lane subfolders. Returns a complete project state snapshot. |
| `session_end` | Validate that context documents were updated during this session. Returns a compliance report. |
| `detect_project` | Detect adoption tier, operational mode, configured providers, and structural completeness. |

### Context Chain

| Tool | Description |
|------|-------------|
| `read_context` | Read one or all context documents (SOT, capsule, checkpoint) with metadata. |
| `update_capsule` | Patch the Context Capsule with structured fields (active task, session summary, next steps). |
| `update_checkpoint` | Append a milestone to the Checkpoint document. Auto-numbers the entry. |

### Work Orders

| Tool | Description |
|------|-------------|
| `list_work_orders` | List work orders with parsed metadata. Lane-aware: scans lane subfolders and centralized `_executed/{lane}/` directories. Supports filtering by status, agent, and lane. |
| `read_work_order` | Read and parse a specific work order by number or filename. Returns criteria completion state, N/A criteria count, and patch metadata. Searches across lanes and executed directories. |
| `create_work_order` | Create a new work order with naming convention enforcement and auto-numbering. Supports lane routing via the `lane` parameter. |
| `complete_work_order` | Validate all acceptance criteria are checked (N/A criteria count as resolved), then move WO to `_executed/`. Lane-aware completion paths. |
| `create_patch_work_order` | Create a patch work order extending a completed parent WO. Uses the `_P{NN}` suffix convention with parent metadata (Parent WO, Patch, Sequence Key). |

### Validation

| Tool | Description |
|------|-------------|
| `lint` | Run praxis-lint.sh and return structured JSON findings. Validates naming, structure, context chain, work order integrity, and N/A criteria guardrails. |

### Scaffolding

| Tool | Description |
|------|-------------|
| `scaffold` | Create the Praxis dev/ folder structure based on tier and mode. Supports lane scaffolding. Uses `_executed/` naming. Safe to run multiple times. |

## What's New in v1.1.0

- **WO Lane System**: Lane-aware scanning across all work order tools. Lanes organize WOs into typed subproject scopes (`{nn}_{type}_{scope}`).
- **Patch Work Orders**: New `create_patch_work_order` tool. Extends completed parent WOs with `_P{NN}` suffix and parent metadata.
- **N/A Criteria**: Parser recognizes `- [ ] ~~text~~ N/A -- reason` format. N/A criteria resolve automatically (not blocking). Guardrails: reason required, max 3/WO.
- **CLI Init**: `npx praxis-mcp init` scaffolds new projects from the terminal with tier/mode/agent options.
- **`_executed/` Preference**: New projects use `_executed/` (sortable). Legacy `executed/` still supported via fallback.
- **Bundled Linter**: Ships `templates/praxis-lint.sh` for CLI init distribution.

## Configuration

The server reads `PRAXIS_PROJECT_DIR` from the environment to determine the project root. All tools accept an optional `project_path` parameter to override this default.

## Architecture

- **Stateless**: No in-memory state between calls. The filesystem is the state.
- **Provider-agnostic**: Uses `*_INIT.md` globs and `wo_*/` patterns, never hardcoded provider names.
- **Zero unnecessary dependencies**: Only the MCP SDK and Zod (both required by the protocol).

## License

MIT
