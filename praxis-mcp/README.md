# Praxis MCP Server

[![npm](https://img.shields.io/npm/v/praxis-mcp?style=flat-square&color=fe5000)](https://www.npmjs.com/package/praxis-mcp)
[![License](https://img.shields.io/badge/license-MIT-667eea?style=flat-square)](../LICENSE)

MCP (Model Context Protocol) server for the [Praxis](https://github.com/LuisFaxas/praxis) AI development methodology. Gives any MCP-compatible AI agent structured tools for session management, work order lifecycle, context chain operations, validation, and project scaffolding.

## Install

```bash
npm install praxis-mcp
```

## Quick Start

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

## Tools (12)

All tools are prefixed as `mcp__praxis__<tool>` by the MCP protocol.

### Session Lifecycle

| Tool | Description |
|------|-------------|
| `session_start` | Read the full context chain + pending work orders in canonical Praxis order. Returns a complete project state snapshot. |
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
| `list_work_orders` | List work orders with status/agent filters. Handles solo and triangle modes. |
| `read_work_order` | Read and parse a specific work order by number or filename. |
| `create_work_order` | Create a new work order with naming convention enforcement and auto-numbering. |
| `complete_work_order` | Validate all acceptance criteria are checked, then move WO to executed/. |

### Validation

| Tool | Description |
|------|-------------|
| `lint` | Run praxis-lint.sh (50 checks, 7 categories) and return structured JSON findings. |

### Scaffolding

| Tool | Description |
|------|-------------|
| `scaffold` | Create the Praxis dev/ folder structure based on tier and mode. Safe to run multiple times. |

## Configuration

The server reads `PRAXIS_PROJECT_DIR` from the environment to determine the project root. All tools accept an optional `project_path` parameter to override this default.

## Architecture

- **Stateless**: No in-memory state between calls. The filesystem is the state.
- **Provider-agnostic**: Uses `*_INIT.md` globs and `wo_*/` patterns, never hardcoded provider names.
- **Zero unnecessary dependencies**: Only the MCP SDK and Zod (both required by the protocol).

## License

MIT
