#!/usr/bin/env bash
# Praxis Lint — Claude Code SessionStart Hook
#
# This wrapper runs praxis-lint at the start of every Claude Code session
# and feeds findings back to Claude as context. Claude sees the lint output
# before it starts working and can proactively fix issues.
#
# Setup:
#   1. Copy this file to your project: .claude/hooks/praxis-lint.sh
#   2. Make it executable: chmod +x .claude/hooks/praxis-lint.sh
#   3. Add the hook to .claude/settings.json (see settings-hook.json)
#
# Or place .praxis/praxis-lint.sh in your project and reference it directly.

set -uo pipefail

# Find the linter script
LINT_SCRIPT=""
for candidate in \
    "$CLAUDE_PROJECT_DIR/.praxis/praxis-lint.sh" \
    "$CLAUDE_PROJECT_DIR/.claude/hooks/praxis-lint-core.sh"; do
    if [ -f "$candidate" ]; then
        LINT_SCRIPT="$candidate"
        break
    fi
done

if [ -z "$LINT_SCRIPT" ]; then
    echo "Praxis lint: script not found — skipping"
    exit 0
fi

# Run the linter in JSON mode for structured output
LINT_OUTPUT=$(bash "$LINT_SCRIPT" --json --quiet --path "$CLAUDE_PROJECT_DIR" 2>/dev/null)
EXIT_CODE=$?

# If everything passes, just note it
if [ $EXIT_CODE -eq 0 ]; then
    echo "Praxis lint: all checks pass."
    exit 0
fi

# Feed findings to Claude as session context
# Claude sees this as additionalContext and can act on it
if command -v jq &>/dev/null; then
    jq -n --arg ctx "$LINT_OUTPUT" '{
        hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: $ctx
        }
    }'
else
    # Fallback if jq is not available — plain text context
    echo "Praxis lint findings (exit code $EXIT_CODE):"
    echo "$LINT_OUTPUT"
fi

exit 0
