# Claude Code Agents and Skills — A Comprehensive Beginner's Guide

> **Summary:** This report explains how Claude Code's agents and skills systems work, what they are, how to create and use them, and the best practices that position you at the leading edge of AI-assisted development. Written for someone encountering these concepts for the first time, with analogies, real examples, and step-by-step guides.

## Table of Contents

- [Overview](#overview)
- [What Are Skills?](#what-are-skills)
- [Creating Your First Skill](#creating-your-first-skill)
- [Skill Anatomy — The SKILL.md File](#skill-anatomy--the-skillmd-file)
- [How Skills Get Invoked](#how-skills-get-invoked)
- [What Are Agents?](#what-are-agents)
- [Built-In Agent Types](#built-in-agent-types)
- [Creating Custom Agents](#creating-custom-agents)
- [Agent Orchestration — Parallel vs. Sequential](#agent-orchestration--parallel-vs-sequential)
- [Hooks — Automating the Lifecycle](#hooks--automating-the-lifecycle)
- [MCP Servers — Extending Claude's Reach](#mcp-servers--extending-claudes-reach)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)
- [Getting Started — Your First 30 Minutes](#getting-started--your-first-30-minutes)
- [Quick Reference Tables](#quick-reference-tables)
- [Sources](#sources)

---

## Overview

Imagine you hired a brilliant assistant who can read your codebase, search the web, write code, run commands, and generate reports. That's Claude Code. But right now, every time you ask it to do something, you're giving instructions from scratch — like calling a contractor and explaining the job specs every single time.

**Skills** and **agents** fix that.

- **Skills** are like **recipes** — reusable instruction sets that tell Claude *how* to do a specific task consistently. Instead of explaining "search the codebase, write a markdown report with these sections, save it here..." every time, you write it once as a skill and invoke it with `/report`.

- **Agents** are like **specialized team members** — each with their own expertise, tools, and context. A security reviewer agent, an explorer agent, a code improver agent. You can send them out to work in parallel, like dispatching scouts in different directions and having them report back.

Together, they transform Claude Code from a general-purpose assistant into a **customized, repeatable workflow engine**.

---

## What Are Skills?

A skill is a markdown file that contains instructions for Claude. When you type `/skill-name` in Claude Code, it loads that file and follows the instructions — like opening a recipe card before cooking.

### The Recipe Analogy

Think of a skill like a recipe card in a restaurant kitchen:

| Recipe Card | Skill |
|-------------|-------|
| Recipe name | Skill name (e.g., `report`) |
| "When to make this dish" | Description field — tells Claude when to use it |
| Ingredient list | `allowed-tools` — what Claude can use |
| Step-by-step instructions | The markdown body — what Claude should do |
| "Serves 4" | `argument-hint` — what input the user provides |
| Stored in recipe binder | Stored in `.claude/skills/skill-name/SKILL.md` |

### Where Skills Live

Skills can exist at different scopes, like configuration files:

| Scope | Path | Who Can Use It |
|-------|------|---------------|
| **Personal** | `~/.claude/skills/my-skill/SKILL.md` | You, across all projects |
| **Project** | `.claude/skills/my-skill/SKILL.md` | Anyone working in this project |
| **Enterprise** | Managed settings (admin-controlled) | Everyone in the organization |

**Priority order:** Enterprise > Personal > Project (if the same skill name exists in multiple places).

### What Skills Are Good For

- **Repeatable workflows** — "Generate a report," "Review this PR," "Fix this GitHub issue"
- **Consistent output** — Every report follows the same structure, every review covers the same checklist
- **Domain knowledge** — "Our API conventions," "Our error handling patterns," "Our design system"
- **Complex multi-step tasks** — "Deploy to staging," "Create a new component with tests"

---

## Creating Your First Skill

Let's create a simple skill that explains code using analogies.

### Step 1 — Create the directory

```bash
mkdir -p .claude/skills/explain-code
```

### Step 2 — Write the SKILL.md

Create `.claude/skills/explain-code/SKILL.md`:

```yaml
---
name: explain-code
description: Explains code with analogies and diagrams. Use when the user asks "how does this work?" or wants to understand a piece of code.
argument-hint: [file-or-function]
---

When explaining code, follow this structure:

1. **Start with an analogy** — Compare the code to something from everyday life
2. **Draw a diagram** — Use ASCII art to show the flow or structure
3. **Walk through line by line** — Explain what each significant section does
4. **Highlight a gotcha** — What's a common mistake or misconception?

Keep the tone conversational. If the concept is complex, use multiple analogies.
```

### Step 3 — Use it

```
/explain-code pages/api/token.js
```

That's it. Claude reads your skill file, applies its instructions, and explains the code using analogies and diagrams — every single time, consistently.

---

## Skill Anatomy — The SKILL.md File

Every skill has two parts: **frontmatter** (the metadata) and **body** (the instructions).

```yaml
---
name: my-skill                        # Display name (lowercase, hyphens)
description: What it does and when     # Claude reads this to decide auto-invocation
argument-hint: [what-to-pass]          # Shown in autocomplete
disable-model-invocation: true         # Only user can invoke (not auto)
user-invocable: true                   # Show in / menu
allowed-tools: Read, Grep, Bash       # Restrict which tools Claude can use
model: sonnet                          # Which Claude model to use
context: fork                          # Run in isolated subagent context
---

# Instructions go here

Do this, then that, then save the result here.

The user's input is available as: $ARGUMENTS
First argument: $ARGUMENTS[0] or $0
Second argument: $ARGUMENTS[1] or $1
Session ID: ${CLAUDE_SESSION_ID}
```

### Frontmatter Fields Explained

| Field | Required | What It Does |
|-------|----------|-------------|
| `name` | No (uses folder name) | The name you type after `/` |
| `description` | Recommended | Claude reads this to decide when to auto-invoke the skill. Make it specific. |
| `argument-hint` | No | Shows `[hint]` in the autocomplete menu so users know what to type |
| `disable-model-invocation` | No | When `true`, only YOU can invoke it with `/name`. Claude won't auto-trigger it. Use for destructive operations like deploy or commit. |
| `user-invocable` | No | When `false`, hides from the `/` menu. Only Claude can use it internally (good for background knowledge). |
| `allowed-tools` | No | Restricts what tools Claude can use. Example: `Read, Grep` makes it read-only. Omit to allow all tools. |
| `model` | No | Force a specific model: `sonnet`, `opus`, or `haiku`. Omit to inherit from the session. |
| `context` | No | Set to `fork` to run in an isolated subagent context (separate conversation, no access to chat history). |

### Dynamic Variables

You can use these placeholders in your skill body — Claude replaces them with real values at runtime:

| Variable | What It Becomes |
|----------|----------------|
| `$ARGUMENTS` | Everything the user typed after `/skill-name` |
| `$ARGUMENTS[0]` or `$0` | First word/argument |
| `$ARGUMENTS[1]` or `$1` | Second word/argument |
| `${CLAUDE_SESSION_ID}` | Unique ID for the current session |

### Shell Command Injection

You can run shell commands *before* Claude sees the skill content. This is powerful for injecting live data:

```yaml
---
name: pr-review
description: Review the current pull request
---

## PR Context (injected live)
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Review the changes above for code quality, security, and test coverage.
```

When this skill runs, Claude sees the *actual diff output*, not the command. It's like a chef who gets fresh ingredients delivered to the prep station before starting the recipe.

### Supporting Files

A skill can include more than just `SKILL.md`. Use supporting files for templates, examples, and reference material:

```
my-skill/
├── SKILL.md              # Main instructions (required, keep under 500 lines)
├── template.md           # A template Claude fills in
├── examples/
│   └── good-output.md    # Example of what the output should look like
├── reference/
│   └── api-spec.md       # Detailed reference Claude can read when needed
└── scripts/
    └── analyze.py        # Script Claude can execute
```

Reference them from your SKILL.md:
```markdown
For the output format, follow the template in [template.md](template.md).
For detailed API specs, see [reference/api-spec.md](reference/api-spec.md).
```

---

## How Skills Get Invoked

There are two ways a skill can be triggered:

### 1. User-Invoked (You Type It)

```
/report agents and skills
/fix-issue 123
/explain-code src/auth/login.ts
```

You control when it runs. This is the default.

### 2. Auto-Invoked (Claude Triggers It)

Claude reads the `description` field of every skill and decides whether to load one based on your message. If you ask "How does this code work?" and you have an `explain-code` skill with a matching description, Claude loads it automatically.

**The control matrix:**

| Setting | You can invoke | Claude can invoke |
|---------|---------------|------------------|
| Default (no flags) | Yes | Yes |
| `disable-model-invocation: true` | Yes | No |
| `user-invocable: false` | No | Yes |

**Rule of thumb:**
- **Auto-invoke** for knowledge/reference skills (API conventions, style guides)
- **Manual-only** (`disable-model-invocation: true`) for action skills (deploy, commit, report generation)

---

## What Are Agents?

If skills are recipes, agents are **sous-chefs** — specialized assistants that work under the head chef (your main Claude Code session).

### The Kitchen Analogy

| Kitchen | Claude Code |
|---------|-------------|
| Head chef (you + main Claude) | Your main conversation |
| Sous-chef specializing in sauces | Explore agent (fast codebase search) |
| Sous-chef specializing in pastry | Plan agent (designing implementation approaches) |
| Line cook who can do anything | General-purpose agent (multi-step tasks) |
| Prep cook with a knife only | Bash agent (just runs commands) |
| Sending a sous-chef to the pantry | Spawning a subagent with the Task tool |
| Getting the dish back from the sous-chef | Subagent returns results to main conversation |

### Key Concepts

- **Subagents** run within your main session. They have their own context window, system prompt, and tool restrictions.
- **The Task tool** is what spawns subagents. When Claude uses the Task tool, it delegates work to a specialized agent.
- **Each agent returns a summary** to the main conversation — keeping your main context clean.
- **Agents can run in the background** while you continue working.

---

## Built-In Agent Types

Claude Code comes with several built-in agent types, each optimized for specific work:

### Explore Agent

**What it does:** Fast, read-only codebase exploration.

**Analogy:** Like sending a scout ahead to survey the terrain before you set up camp. It can look around but can't build anything.

| Property | Value |
|----------|-------|
| Model | Haiku (fast, cheap) |
| Tools | Read-only (Read, Grep, Glob) — no Write/Edit |
| Best for | Finding files, understanding structure, searching for patterns |
| Speed | Fast — uses a smaller, quicker model |

**When to use it:**
```
Search the codebase for all files that handle authentication
Find where the Snowflake connection is configured
What components use the antd Table component?
```

### Plan Agent

**What it does:** Research and design implementation approaches.

**Analogy:** Like an architect who surveys the building before drawing blueprints. They study everything but don't swing a hammer.

| Property | Value |
|----------|-------|
| Model | Inherits from main session |
| Tools | Read-only (no Write/Edit) |
| Best for | Designing approaches, analyzing architecture, planning refactors |

### General-Purpose Agent

**What it does:** Complex, multi-step tasks with full tool access.

**Analogy:** Like a full-stack contractor — they can read blueprints, write code, run tests, and ship the result.

| Property | Value |
|----------|-------|
| Model | Inherits from main session |
| Tools | All tools available |
| Best for | Research requiring multiple steps, code modifications, comprehensive analysis |

### Bash Agent

**What it does:** Runs terminal commands in an isolated context.

| Property | Value |
|----------|-------|
| Model | Inherits |
| Tools | Bash only |
| Best for | Running builds, tests, git operations |

---

## Creating Custom Agents

You can create your own specialized agents with custom instructions, tool restrictions, and even dedicated skills.

### Where Custom Agents Live

```
.claude/agents/my-agent.md          # Project-level (shared with team)
~/.claude/agents/my-agent.md        # Personal (available everywhere)
```

### Agent File Format

```yaml
---
name: security-reviewer
description: Security specialist. Use proactively after code changes to check for vulnerabilities.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a senior security engineer reviewing code for vulnerabilities.

When invoked:
1. Run `git diff` to see recent changes
2. Focus on modified files
3. Check for OWASP Top 10 vulnerabilities
4. Look for hardcoded secrets, SQL injection, XSS
5. Report findings with severity ratings

Output format:
- CRITICAL: [issue] in [file:line]
- HIGH: [issue] in [file:line]
- MEDIUM: [issue] in [file:line]
```

### Agent Frontmatter Fields

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier |
| `description` | When Claude should delegate to this agent (very important) |
| `tools` | Allowlist of tools (e.g., `Read, Grep, Glob`) |
| `disallowedTools` | Denylist of tools |
| `model` | `sonnet`, `opus`, `haiku`, or inherit |
| `maxTurns` | Maximum number of turns before stopping |
| `skills` | Skills to preload into the agent's context |
| `mcpServers` | MCP servers available to this agent |
| `memory` | Persistent memory scope: `user`, `project`, or `local` |

### Agent vs. Skill — When to Use Which

| Use Case | Skill | Agent |
|----------|-------|-------|
| Consistent output format (reports, docs) | Yes | — |
| Specialized expertise (security, performance) | — | Yes |
| User types a command (`/something`) | Yes | — |
| Claude auto-delegates based on task | — | Yes |
| Needs restricted tool access | Either | Either |
| Needs its own conversation context | Skill with `context: fork` | Yes (always isolated) |
| Reusable instructions for a task | Yes | — |
| Reusable persona for ongoing work | — | Yes |

---

## Agent Orchestration — Parallel vs. Sequential

### Parallel Agents

Send multiple agents out at the same time when their tasks are independent:

```
Research the authentication, database, and API modules
in parallel using separate subagents.
```

**Analogy:** Like sending three scouts in different directions — north, south, and east. They don't need to wait for each other because they're exploring different areas.

**When to use parallel:**
- Exploring independent parts of a codebase
- Running different types of analysis simultaneously
- Research that doesn't depend on other research results

### Sequential Agents

Chain agents when one needs the output of another:

```
Use the explore agent to find all API routes,
then use the security-reviewer agent to audit them.
```

**Analogy:** Like a relay race — the first runner finishes and passes the baton to the next.

**When to use sequential:**
- Analysis → Fix pipeline
- Discovery → Implementation
- Research → Report generation

### Background Agents

Agents can run in the background while you continue working:

```
Run this analysis in the background.
```

Or press `Ctrl+B` to send a task to the background. Claude pre-approves permissions and runs independently, notifying you when done.

---

## Hooks — Automating the Lifecycle

Hooks are shell commands that run at specific points in Claude Code's lifecycle. They're **deterministic** — they always run, unlike skills which Claude may or may not invoke.

### The Assembly Line Analogy

Think of hooks like quality control stations on an assembly line:

| Assembly Line | Hook |
|---------------|------|
| Raw materials arrive | `SessionStart` — when a session begins |
| Worker picks up a tool | `PreToolUse` — before a tool executes (can block it) |
| Worker puts down a tool | `PostToolUse` — after a tool succeeds |
| Product quality check | `Stop` — when Claude finishes responding |
| Shift ends | `SessionEnd` — when the session terminates |

### Hook Lifecycle Events

| Event | When It Fires | Can Block? |
|-------|---------------|-----------|
| `SessionStart` | Session begins or resumes | No |
| `UserPromptSubmit` | You submit a prompt | Yes (exit 2) |
| `PreToolUse` | Before a tool executes | Yes (exit 2) |
| `PostToolUse` | After a tool succeeds | No |
| `Stop` | Claude finishes responding | No |
| `SubagentStart` | A subagent spawns | No |
| `SubagentStop` | A subagent finishes | No |
| `SessionEnd` | Session terminates | No |

### Hook Types

**1. Command Hooks** — Run a shell command:
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "npx prettier --write $(jq -r '.tool_input.file_path')"
      }]
    }]
  }
}
```
This auto-formats any file after Claude edits it.

**2. Prompt Hooks** — Ask a fast AI model to make a decision:
```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "prompt",
        "prompt": "Check if all tasks are complete. If not, respond with {\"ok\": false, \"reason\": \"what remains\"}."
      }]
    }]
  }
}
```

**3. Agent Hooks** — Spawn a full subagent to verify something:
```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "agent",
        "prompt": "Verify that all unit tests pass.",
        "timeout": 120
      }]
    }]
  }
}
```

### Where to Configure Hooks

| Location | Scope |
|----------|-------|
| `~/.claude/settings.json` | All your projects |
| `.claude/settings.json` | This project (shareable) |
| `.claude/settings.local.json` | This project (personal, gitignored) |
| Agent frontmatter | While that agent runs |
| Skill frontmatter | While that skill is active |

### Practical Hook Examples

**Auto-format after edits:**
Ensures consistent code style without relying on Claude to remember.

**Block edits to protected files:**
Prevents accidental modifications to production configs or generated files.

**Desktop notification when Claude needs input:**
```json
{
  "hooks": {
    "Notification": [{
      "hooks": [{
        "type": "command",
        "command": "osascript -e 'display notification \"Claude needs attention\" with title \"Claude Code\"'"
      }]
    }]
  }
}
```

---

## MCP Servers — Extending Claude's Reach

The **Model Context Protocol (MCP)** lets Claude connect to external services — databases, issue trackers, design tools, monitoring systems — through a standardized interface.

### The Plugin Analogy

MCP servers are like **plugins for a power tool**. Your drill (Claude) is powerful on its own, but with the right attachment (MCP server), it can drive screws into drywall (query Snowflake), bore through metal (create Jira tickets), or sand surfaces (analyze Sentry errors).

### What MCP Enables

With MCP servers connected, Claude can:
- Query databases directly
- Read and create GitHub issues/PRs
- Analyze monitoring data from Sentry or Datadog
- Access design files from Figma
- Send Slack messages
- And more — any service with an MCP server

### Installing MCP Servers

**Remote HTTP server (for cloud services):**
```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
```

**Local stdio server (for local tools):**
```bash
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://user:pass@localhost/db"
```

### Managing MCP Servers

```bash
claude mcp list                # List all configured servers
claude mcp get github          # Details for a specific server
claude mcp remove github       # Remove a server
/mcp                           # Inside Claude Code: check status
```

### MCP in Agents

You can give specific agents access to specific MCP servers:

```yaml
---
name: github-reviewer
description: Review GitHub pull requests
mcpServers:
  - github
tools: Read, Grep, Glob, Bash
---
```

---

## Best Practices

### Skills

- **Keep SKILL.md under 500 lines** — move detailed reference to supporting files
- **Write specific descriptions** — include keywords users would naturally say ("Use when...", "Use for...")
- **Use `disable-model-invocation: true`** for anything destructive (deploy, commit, delete)
- **Include output format examples** — show Claude exactly what the result should look like
- **Use `$ARGUMENTS`** for flexible input — don't hardcode values
- **Test with simple inputs first** — validate the skill works before complex usage

### Agents

- **Design focused agents** — each should excel at one specific task
- **Limit tool access** — read-only agents for research (`tools: Read, Grep, Glob`), full access for implementation
- **Write detailed descriptions** — Claude uses these to decide when to delegate
- **Use background agents** for long-running tasks (test suites, large analyses)
- **Run parallel agents** when exploring independent areas of a codebase

### Hooks

- **Use command hooks** for deterministic actions (formatting, notifications)
- **Use prompt hooks** for simple yes/no decisions
- **Use agent hooks** for complex verification (checking test results, validating changes)
- **Store project hooks** in `.claude/settings.json` (shareable with team)

### General

- **Start conservative** — add skills and agents as you identify repeatable patterns, not upfront
- **Iterate** — run a skill, review the output, refine the instructions
- **Don't duplicate CLAUDE.md** — use CLAUDE.md for broad conventions, skills for specific workflows
- **Keep main context clean** — offload verbose operations to subagents

---

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| **Skill auto-invokes when it shouldn't** | Description is too broad | Make description more specific, or add `disable-model-invocation: true` |
| **Skill never auto-invokes** | Description doesn't match how you talk | Add more keywords to the description |
| **Agent output is too verbose** | Agent dumps everything into main context | Use a subagent — results are summarized when returned |
| **Inconsistent report format** | No template provided | Add a template file and reference it from SKILL.md |
| **Hook blocks everything** | Matcher is too broad | Use specific matchers: `"Bash"` instead of `".*"` |
| **Too many skills loaded** | Skills consume context space (2% budget) | Remove low-value skills, use `disable-model-invocation` to reduce context |
| **Skill content + CLAUDE.md overlap** | Same rules in both places | CLAUDE.md = broad conventions; Skills = specific task workflows |
| **New skills not detected** | Created during current session | Skills are discovered at session start — restart Claude Code or start a new chat |

---

## Getting Started — Your First 30 Minutes

### Minute 0–10: Create Your First Skill

1. **Pick a task you do repeatedly** — code review, report generation, bug investigation
2. **Create the directory:**
   ```bash
   mkdir -p .claude/skills/my-skill
   ```
3. **Write a simple SKILL.md** with name, description, and instructions
4. **Test it** with `/my-skill [input]`

### Minute 10–20: Create a Custom Agent

1. **Pick a role** — security reviewer, performance analyst, test writer
2. **Create the file:**
   ```bash
   mkdir -p .claude/agents
   ```
3. **Write a markdown file** with name, description, tools, and instructions
4. **Ask Claude** to use it: "Use the security-reviewer agent to check my recent changes"

### Minute 20–30: Set Up a Hook

1. **Pick an automation** — auto-format, notifications, file protection
2. **Add to `.claude/settings.json`:**
   ```json
   {
     "hooks": {
       "PostToolUse": [{
         "matcher": "Edit|Write",
         "hooks": [{
           "type": "command",
           "command": "echo 'File modified' >> .claude/edit-log.txt"
         }]
       }]
     }
   }
   ```
3. **Test it** by asking Claude to edit a file

### Beyond 30 Minutes

- Add MCP servers for your most-used services
- Create a `/commit` skill that follows your team's commit conventions
- Build a `/review` agent that checks code against your team's standards
- Set up a `PreToolUse` hook that blocks writes to production config files

---

## Quick Reference Tables

### Skill File Locations

| Scope | Path | Shared? |
|-------|------|---------|
| Personal | `~/.claude/skills/name/SKILL.md` | No — just you |
| Project | `.claude/skills/name/SKILL.md` | Yes — commit to repo |
| Enterprise | Managed settings | Yes — admin-controlled |

### Agent File Locations

| Scope | Path | Shared? |
|-------|------|---------|
| Personal | `~/.claude/agents/name.md` | No — just you |
| Project | `.claude/agents/name.md` | Yes — commit to repo |
| CLI flag | `--agents path` | Session only |

### Variable Reference

| Variable | Expands To |
|----------|-----------|
| `$ARGUMENTS` | All arguments after `/skill-name` |
| `$0`, `$1`, `$2` | Individual arguments by position |
| `$ARGUMENTS[N]` | Same as `$N` (longer form) |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `` !`command` `` | Output of shell command (runs before Claude sees the prompt) |

### Hook Events

| Event | Can Block? | Common Use |
|-------|-----------|------------|
| `SessionStart` | No | Load context, check environment |
| `PreToolUse` | Yes | Validate, protect files, enforce rules |
| `PostToolUse` | No | Auto-format, log, notify |
| `Stop` | No | Verify completeness, run checks |
| `SessionEnd` | No | Cleanup, save state |

---

## Sources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) — Official skill creation guide
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) — Agent types and orchestration
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) — Lifecycle hooks reference
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) — MCP server setup and management
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) — Experimental multi-agent coordination
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) — Official best practices guide
- [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works) — Architecture overview
