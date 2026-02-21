#!/usr/bin/env bash
# praxis-lint.sh — Praxis Methodology Validation Tool
# https://github.com/LuisFaxas/praxis
#
# A zero-dependency bash script that validates whether a project's dev/ folder
# conforms to the Praxis methodology. Checks 7 categories (50 checks total),
# outputs human-readable colored text or structured JSON, and returns CI/CD-
# compatible exit codes.
#
# Usage: bash .praxis/praxis-lint.sh [options]
# Run with --help for full usage information.

set -uo pipefail

# ─────────────────────────────────────────────────
# Layer 1: Constants
# ─────────────────────────────────────────────────

PRAXIS_LINT_VERSION="1.2.0"

# Configuration (overridden by flags)
PRAXIS_TARGET_DIR="."
PRAXIS_TIER="auto"
PRAXIS_STRICT=0
PRAXIS_QUIET=0
PRAXIS_JSON=0
PRAXIS_NO_COLOR=0
PRAXIS_SKIP_FRESHNESS=0
PRAXIS_SKIP_SECURITY=0
PRAXIS_FIX=0

# Counters
COUNT_PASS=0
COUNT_WARN=0
COUNT_FAIL=0
COUNT_INFO=0

# Accumulators
FAILURES=()
WARNINGS=()
FINDINGS=()
FIXABLE_DIRS=()

# Detection results (set during main)
DETECTED_TIER=""
DETECTED_MODE=""

# Color codes (set by setup_colors)
RED="" GREEN="" YELLOW="" CYAN="" BOLD="" DIM="" RESET=""

# ─────────────────────────────────────────────────
# Layer 2: Argument Parser
# ─────────────────────────────────────────────────

print_help() {
    cat <<'HELP'
Praxis Lint — Methodology Validation Tool

Usage: bash .praxis/praxis-lint.sh [options]

Options:
  -h, --help              Show this help message
  -p, --path <dir>        Target project directory (default: current dir)
  -t, --tier <tier>       Force tier: starter|standard|full|auto (default: auto)
  --strict                Treat warnings as failures (exit 2 on WARN)
  --lenient               Only fail on FAIL-level issues (default)
  --quiet                 Suppress PASS and INFO output
  --json                  Output in JSON format (for hooks / CI)
  --skip-security         Skip the security scan
  --skip-freshness        Skip context staleness checks
  --fix                   Auto-fix trivial issues (create missing dirs)
  --no-color              Disable ANSI color codes

Exit codes:
  0  All checks pass (or INFO-only findings)
  1  Warnings found (methodology is drifting)
  2  Failures found (methodology is broken)

Examples:
  bash .praxis/praxis-lint.sh                     # Lint current directory
  bash .praxis/praxis-lint.sh --path /my/project  # Lint a specific project
  bash .praxis/praxis-lint.sh --json --quiet      # JSON output for hooks
  bash .praxis/praxis-lint.sh --fix               # Auto-create missing dirs
  bash .praxis/praxis-lint.sh --strict            # Warnings become failures

Integration:
  GitHub Actions:  See .praxis/examples/github-action.yml
  Claude Code:     See .praxis/examples/claude-hook.sh
  Pre-commit:      See README.md Validation section

More info: https://github.com/LuisFaxas/praxis
HELP
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)       print_help; exit 0 ;;
            -p|--path)       PRAXIS_TARGET_DIR="$2"; shift 2 ;;
            -t|--tier)       PRAXIS_TIER="$2"; shift 2 ;;
            --strict)        PRAXIS_STRICT=1; shift ;;
            --lenient)       PRAXIS_STRICT=0; shift ;;
            --quiet)         PRAXIS_QUIET=1; shift ;;
            --json)          PRAXIS_JSON=1; shift ;;
            --skip-security) PRAXIS_SKIP_SECURITY=1; shift ;;
            --skip-freshness) PRAXIS_SKIP_FRESHNESS=1; shift ;;
            --fix)           PRAXIS_FIX=1; shift ;;
            --no-color)      PRAXIS_NO_COLOR=1; shift ;;
            *)
                printf "Unknown option: %s\n" "$1" >&2
                printf "Run with --help for usage.\n" >&2
                exit 1
                ;;
        esac
    done
}

# ─────────────────────────────────────────────────
# Layer 3: Output Helpers + JSON Accumulator
# ─────────────────────────────────────────────────

setup_colors() {
    if [ "$PRAXIS_NO_COLOR" -eq 1 ] || [ ! -t 1 ] || [ "$PRAXIS_JSON" -eq 1 ]; then
        RED="" GREEN="" YELLOW="" CYAN="" BOLD="" DIM="" RESET=""
    else
        RED='\033[0;31m'
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        CYAN='\033[0;36m'
        BOLD='\033[1m'
        DIM='\033[2m'
        RESET='\033[0m'
    fi
}

print_pass() {
    COUNT_PASS=$((COUNT_PASS + 1))
    [ "$PRAXIS_QUIET" -eq 1 ] && return 0
    [ "$PRAXIS_JSON" -eq 1 ] && return 0
    printf "  ${GREEN}[PASS]${RESET} %s\n" "$1"
}

print_warn() {
    COUNT_WARN=$((COUNT_WARN + 1))
    WARNINGS+=("$1")
    [ "$PRAXIS_JSON" -eq 1 ] && return 0
    printf "  ${YELLOW}[WARN]${RESET} %s\n" "$1"
}

print_fail() {
    COUNT_FAIL=$((COUNT_FAIL + 1))
    FAILURES+=("$1")
    [ "$PRAXIS_JSON" -eq 1 ] && return 0
    printf "  ${RED}[FAIL]${RESET} %s\n" "$1"
}

print_info() {
    COUNT_INFO=$((COUNT_INFO + 1))
    [ "$PRAXIS_QUIET" -eq 1 ] && return 0
    [ "$PRAXIS_JSON" -eq 1 ] && return 0
    printf "  ${CYAN}[INFO]${RESET} %s\n" "$1"
}

print_header() {
    [ "$PRAXIS_JSON" -eq 1 ] && return 0
    printf "\n${BOLD}%s${RESET}\n" "$1"
}

# Dual-output emitter: prints human output AND accumulates for JSON
emit() {
    local id="$1" category="$2" severity="$3" message="$4" fix="${5:-}"

    # Escape double quotes for JSON safety
    local safe_msg="${message//\"/\\\"}"
    local safe_fix="${fix//\"/\\\"}"

    # Always accumulate for JSON
    FINDINGS+=("{\"id\":\"${id}\",\"category\":\"${category}\",\"severity\":\"${severity}\",\"message\":\"${safe_msg}\",\"fix\":\"${safe_fix}\"}")

    # Print human output
    case "$severity" in
        pass) print_pass "$message" ;;
        warn) print_warn "$message" ;;
        fail) print_fail "$message" ;;
        info) print_info "$message" ;;
    esac
}

# ─────────────────────────────────────────────────
# Layer 4: Utility Functions
# ─────────────────────────────────────────────────

# Cross-platform file age in days (Linux + macOS)
get_file_age_days() {
    local file="$1"
    [ -f "$file" ] || { echo 99999; return; }

    local last_modified
    last_modified=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null)

    if [ -z "$last_modified" ]; then
        echo 99999
        return
    fi

    local now
    now=$(date +%s)
    echo $(( (now - last_modified) / 86400 ))
}

# Detect adoption tier by examining folder structure
detect_tier() {
    local dev_dir="$PRAXIS_TARGET_DIR/dev"

    if [ -d "$dev_dir/audit" ] && [ -d "$dev_dir/reports" ] && [ -d "$dev_dir/design" ]; then
        echo "full"
    elif [ -d "$dev_dir/research" ] && [ -d "$dev_dir/planning" ]; then
        echo "standard"
    else
        echo "starter"
    fi
}

# Detect solo vs triangle mode by counting provider init files
detect_triangle_mode() {
    local init_dir="$PRAXIS_TARGET_DIR/dev/init"
    local provider_count=0

    if [ ! -d "$init_dir" ]; then
        echo "solo"
        return
    fi

    for init_file in "$init_dir"/*_INIT.md; do
        [ -f "$init_file" ] || continue
        [[ "$(basename "$init_file")" == "PRAXIS_INIT.md" ]] && continue
        provider_count=$((provider_count + 1))
    done

    if [ "$provider_count" -ge 2 ]; then
        echo "triangle"
    else
        echo "solo"
    fi
}

# ─────────────────────────────────────────────────
# Layer 5: Check Functions (7 Categories)
# ─────────────────────────────────────────────────

# --- Category 1: Structure Validation (S-001 to S-022) ---

check_structure() {
    print_header "Structure"
    local dev_dir="$PRAXIS_TARGET_DIR/dev"
    local tier="$DETECTED_TIER"

    # Helper: check path exists (file or directory)
    _check_path() {
        local path="$1" severity="$2" id="$3" label="${4:-}"
        [ -z "$label" ] && label="${path#$dev_dir/}"

        if [ -e "$path" ]; then
            emit "$id" "structure" "pass" "$label"
        else
            emit "$id" "structure" "$severity" "Missing: $label" "mkdir -p $path"
            # Track fixable directories (not files)
            if [[ "$severity" != "fail" ]] || [[ "$id" == "S-005" ]] || [[ "$id" == "S-006" ]]; then
                FIXABLE_DIRS+=("$path")
            fi
        fi
    }

    # All tiers — core requirements (FAIL)
    _check_path "$dev_dir"                              "fail" "S-001" "dev/"
    [ ! -d "$dev_dir" ] && return  # Early exit if no dev/

    _check_path "$dev_dir/source_of_truth.md"           "fail" "S-002" "source_of_truth.md"
    _check_path "$dev_dir/context_capsule.md"           "fail" "S-003" "context_capsule.md"
    _check_path "$dev_dir/checkpoint.md"                "fail" "S-004" "checkpoint.md"
    _check_path "$dev_dir/work-orders"                  "fail" "S-005" "work-orders/"
    _check_path "$dev_dir/work-orders/executed"         "fail" "S-006" "work-orders/executed/"

    # Standard+ tier (WARN)
    if [ "$tier" != "starter" ]; then
        _check_path "$dev_dir/research/active"              "warn" "S-007" "research/active/"
        _check_path "$dev_dir/research/archive"             "warn" "S-008" "research/archive/"
        _check_path "$dev_dir/planning/master-plan/draft"   "warn" "S-009" "planning/master-plan/draft/"
        _check_path "$dev_dir/planning/master-plan/approved" "warn" "S-010" "planning/master-plan/approved/"
        _check_path "$dev_dir/commands/active"              "warn" "S-011" "commands/active/"
        _check_path "$dev_dir/commands/executed"            "warn" "S-012" "commands/executed/"
    fi

    # Full tier (WARN + INFO)
    if [ "$tier" = "full" ]; then
        _check_path "$dev_dir/audit/current"                "warn" "S-013" "audit/current/"
        _check_path "$dev_dir/audit/legacy"                 "warn" "S-014" "audit/legacy/"
        _check_path "$dev_dir/reports/draft/html"           "warn" "S-015" "reports/draft/html/"
        _check_path "$dev_dir/reports/draft/written"        "warn" "S-016" "reports/draft/written/"
        _check_path "$dev_dir/reports/published/html"       "warn" "S-017" "reports/published/html/"
        _check_path "$dev_dir/reports/published/written"    "warn" "S-018" "reports/published/written/"
        _check_path "$dev_dir/design/audit/screenshots"     "info" "S-019" "design/audit/screenshots/"
        _check_path "$dev_dir/design/language"              "info" "S-020" "design/language/"
        _check_path "$dev_dir/design/resources"             "info" "S-021" "design/resources/"
        _check_path "$dev_dir/archive"                      "info" "S-022" "archive/"
    fi

    # Triangle mode: check agent WO subfolders
    if [ "$DETECTED_MODE" = "triangle" ]; then
        local found_agent_dirs=0
        for agent_dir in "$dev_dir/work-orders"/wo_*/; do
            [ -d "$agent_dir" ] || continue
            found_agent_dirs=1
            local agent_name
            agent_name=$(basename "$agent_dir")
            _check_path "$agent_dir/executed" "warn" "S-TRI" "$agent_name/executed/"
        done
        if [ "$found_agent_dirs" -eq 0 ]; then
            emit "S-TRI" "structure" "warn" "Triangle mode detected but no wo_*/ folders found" \
                "Create agent folders: mkdir -p dev/work-orders/wo_{agent}/executed"
        fi
    fi
}

# --- Category 2: Context Chain Freshness (CF-001 to CF-006) ---

check_freshness() {
    print_header "Context Freshness"
    local dev_dir="$PRAXIS_TARGET_DIR/dev"

    # CF-001/CF-002: context_capsule.md age
    local capsule="$dev_dir/context_capsule.md"
    if [ -f "$capsule" ]; then
        local capsule_age
        capsule_age=$(get_file_age_days "$capsule")

        if [ "$capsule_age" -gt 14 ]; then
            emit "CF-002" "context_freshness" "fail" \
                "context_capsule.md last updated ${capsule_age} days ago (threshold: 14 days)" \
                "Update context_capsule.md with current session state"
        elif [ "$capsule_age" -gt 7 ]; then
            emit "CF-001" "context_freshness" "warn" \
                "context_capsule.md last updated ${capsule_age} days ago (threshold: 7 days)" \
                "Update context_capsule.md with current session state"
        else
            emit "CF-001" "context_freshness" "pass" \
                "context_capsule.md is fresh (${capsule_age} days old)"
        fi
    fi

    # CF-003: checkpoint.md age
    local checkpoint="$dev_dir/checkpoint.md"
    if [ -f "$checkpoint" ]; then
        local checkpoint_age
        checkpoint_age=$(get_file_age_days "$checkpoint")

        if [ "$checkpoint_age" -gt 30 ]; then
            emit "CF-003" "context_freshness" "warn" \
                "checkpoint.md last updated ${checkpoint_age} days ago (threshold: 30 days)" \
                "Update checkpoint.md with latest milestones"
        else
            emit "CF-003" "context_freshness" "pass" \
                "checkpoint.md is fresh (${checkpoint_age} days old)"
        fi
    fi

    # CF-004: source_of_truth.md not empty
    local sot="$dev_dir/source_of_truth.md"
    if [ -f "$sot" ]; then
        local sot_size
        sot_size=$(wc -c < "$sot" 2>/dev/null || echo 0)
        sot_size=$(echo "$sot_size" | tr -d ' ')

        if [ "$sot_size" -lt 100 ]; then
            emit "CF-004" "context_freshness" "fail" \
                "source_of_truth.md is too small (${sot_size} bytes, min: 100)" \
                "Populate source_of_truth.md with project decisions and rules"
        else
            emit "CF-004" "context_freshness" "pass" \
                "source_of_truth.md has content (${sot_size} bytes)"
        fi
    fi

    # CF-005: context_capsule.md not empty
    if [ -f "$capsule" ]; then
        local capsule_size
        capsule_size=$(wc -c < "$capsule" 2>/dev/null || echo 0)
        capsule_size=$(echo "$capsule_size" | tr -d ' ')

        if [ "$capsule_size" -lt 50 ]; then
            emit "CF-005" "context_freshness" "fail" \
                "context_capsule.md is too small (${capsule_size} bytes, min: 50)" \
                "Populate context_capsule.md with session handoff state"
        else
            emit "CF-005" "context_freshness" "pass" \
                "context_capsule.md has content (${capsule_size} bytes)"
        fi
    fi

    # CF-006: context_capsule.md contains expected sections
    if [ -f "$capsule" ]; then
        if grep -qEi "(last session|active task|current status|next steps)" "$capsule" 2>/dev/null; then
            emit "CF-006" "context_freshness" "pass" \
                "context_capsule.md contains expected sections"
        else
            emit "CF-006" "context_freshness" "warn" \
                "context_capsule.md missing expected sections (Last Session, Active Task, etc.)" \
                "Add session handoff sections to context_capsule.md"
        fi
    fi
}

# --- Category 3: Work Order Integrity (WO-001 to WO-005) ---

check_work_orders() {
    print_header "Work Order Integrity"
    local dev_dir="$PRAXIS_TARGET_DIR/dev"
    local wo_dir="$dev_dir/work-orders"

    [ -d "$wo_dir" ] || return 0

    # Internal: check executed directory for incomplete WOs
    _check_executed_dir() {
        local exec_dir="$1"
        local label_prefix="${2:-}"

        [ -d "$exec_dir" ] || return 0

        local found_any=0
        for wo in "$exec_dir"/*.md; do
            [ -f "$wo" ] || continue
            local filename
            filename=$(basename "$wo")

            # Skip READMEs and examples (0_* prefix)
            [[ "$filename" == 0_* ]] && continue

            found_any=1
            local unchecked
            unchecked=$(grep -c "\- \[ \]" "$wo" 2>/dev/null || echo 0)

            if [ "$unchecked" -gt 0 ]; then
                emit "WO-001" "work_order_integrity" "fail" \
                    "${label_prefix}${filename} has ${unchecked} unchecked criterion in executed/" \
                    "Complete acceptance criteria or move WO back to active queue"
            else
                emit "WO-001" "work_order_integrity" "pass" \
                    "${label_prefix}${filename} — all criteria complete"
            fi
        done

        if [ "$found_any" -eq 0 ]; then
            emit "WO-001" "work_order_integrity" "info" \
                "${label_prefix}executed/ has no non-example WOs"
        fi
    }

    # Internal: check active queue for required fields
    _check_active_wo() {
        local active_dir="$1"
        local label_prefix="${2:-}"

        for wo in "$active_dir"/*.md; do
            [ -f "$wo" ] || continue
            local filename
            filename=$(basename "$wo")

            # Skip READMEs and examples (0_* prefix)
            [[ "$filename" == 0_* ]] && continue

            # WO-002: Acceptance Criteria section
            if ! grep -q "## Acceptance Criteria" "$wo" 2>/dev/null; then
                emit "WO-002" "work_order_integrity" "warn" \
                    "${label_prefix}${filename} — missing '## Acceptance Criteria' section" \
                    "Add an Acceptance Criteria section with checkboxes"
            fi

            # WO-003: Status field
            if ! grep -qi "Status:" "$wo" 2>/dev/null; then
                emit "WO-003" "work_order_integrity" "warn" \
                    "${label_prefix}${filename} — missing 'Status:' field" \
                    "Add a Status: field in the WO header"
            fi

            # WO-004: Staleness check (>30 days)
            local wo_age
            wo_age=$(get_file_age_days "$wo")
            if [ "$wo_age" -gt 30 ]; then
                emit "WO-004" "work_order_integrity" "warn" \
                    "${label_prefix}${filename} — ${wo_age} days old without completion" \
                    "Review this WO: complete it, update it, or archive it"
            fi
        done
    }

    # Route based on mode
    if [ "$DETECTED_MODE" = "triangle" ]; then
        local found_agent_wo=0
        for agent_dir in "$wo_dir"/wo_*/; do
            [ -d "$agent_dir" ] || continue
            found_agent_wo=1
            local agent_name
            agent_name=$(basename "$agent_dir")
            _check_executed_dir "$agent_dir/executed" "$agent_name/"
            _check_active_wo "$agent_dir" "$agent_name/"
        done
        if [ "$found_agent_wo" -eq 0 ]; then
            emit "WO-000" "work_order_integrity" "info" \
                "Triangle mode active but no wo_*/ folders yet — using flat queue"
            _check_executed_dir "$wo_dir/executed" ""
            _check_active_wo "$wo_dir" ""
        fi
    else
        _check_executed_dir "$wo_dir/executed" ""
        _check_active_wo "$wo_dir" ""
    fi
}

# --- Category 4: Naming Convention (NC-001 to NC-004) ---

check_naming() {
    print_header "Naming Convention"
    local dev_dir="$PRAXIS_TARGET_DIR/dev"

    local NAMING_PATTERN='^[0-9]+_[0-9]{4}-[0-9]{2}-[0-9]{2}_.+\..+$'
    local total=0
    local conforming=0

    while IFS= read -r -d '' filepath; do
        local filename
        filename=$(basename "$filepath")

        # Skip exempt files: core docs
        case "$filename" in
            source_of_truth.md|context_capsule.md|checkpoint.md) continue ;;
        esac

        # Skip exempt files: any *_INIT.md
        [[ "$filename" == *_INIT.md ]] && continue

        # Skip README.md files
        [[ "$filename" == "README.md" ]] && continue

        total=$((total + 1))

        # NC-003: No spaces in filenames (FAIL)
        if [[ "$filename" == *" "* ]]; then
            emit "NC-003" "naming_convention" "fail" \
                "Spaces in filename: ${filepath#$PRAXIS_TARGET_DIR/}" \
                "Rename to use underscores instead of spaces"
            continue
        fi

        # NC-004: No uppercase extensions (WARN)
        local ext="${filename##*.}"
        if [[ "$ext" =~ [A-Z] ]] && [ "$ext" != "$filename" ]; then
            emit "NC-004" "naming_convention" "warn" \
                "Uppercase extension: ${filepath#$PRAXIS_TARGET_DIR/}" \
                "Rename to use lowercase extension (.${ext,,})"
            continue
        fi

        # NC-001: Check naming pattern
        if [[ "$filename" =~ $NAMING_PATTERN ]]; then
            conforming=$((conforming + 1))
        else
            emit "NC-001" "naming_convention" "warn" \
                "Non-conforming name: ${filepath#$PRAXIS_TARGET_DIR/}" \
                "Rename to {number}_{YYYY-MM-DD}_{DESCRIPTION}.ext"
        fi

    done < <(find "$dev_dir" -type f -name "*.md" -not -path "*/private/*" -print0 2>/dev/null)

    # Summary
    if [ "$total" -gt 0 ]; then
        local non_conforming=$((total - conforming))
        if [ "$non_conforming" -eq 0 ]; then
            emit "NC-001" "naming_convention" "pass" \
                "All ${total} files conform to naming convention"
        else
            emit "NC-001" "naming_convention" "info" \
                "${conforming}/${total} files conform to naming convention"
        fi
    else
        emit "NC-001" "naming_convention" "info" \
            "No non-exempt .md files found in dev/"
    fi
}

# --- Category 5: Security Scan (SEC-001 to SEC-005) ---

check_security() {
    print_header "Security"
    local dev_dir="$PRAXIS_TARGET_DIR/dev"
    local found_issues=0

    # SEC-001: Private key headers (FAIL)
    local key_files
    key_files=$(grep -rlE "BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY" "$dev_dir" \
        --include="*.md" --include="*.txt" --include="*.yml" --include="*.yaml" \
        2>/dev/null | grep -v "/private/" || true)

    if [ -n "$key_files" ]; then
        found_issues=1
        while IFS= read -r f; do
            emit "SEC-001" "security" "fail" \
                "Private key found: ${f#$PRAXIS_TARGET_DIR/}" \
                "Remove the private key from this file immediately"
        done <<< "$key_files"
    fi

    # SEC-002: AWS access key pattern (FAIL)
    local aws_files
    aws_files=$(grep -rlE "AKIA[0-9A-Z]{16}" "$dev_dir" \
        --include="*.md" --include="*.txt" --include="*.yml" --include="*.yaml" \
        2>/dev/null | grep -v "/private/" || true)

    if [ -n "$aws_files" ]; then
        found_issues=1
        while IFS= read -r f; do
            emit "SEC-002" "security" "fail" \
                "AWS access key pattern: ${f#$PRAXIS_TARGET_DIR/}" \
                "Remove the AWS key and rotate it"
        done <<< "$aws_files"
    fi

    # SEC-003: Generic secret assignment (WARN)
    local secret_files
    secret_files=$(grep -rlEi "(password|secret|token|api_key)\s*[=:]\s*.{8,}" "$dev_dir" \
        --include="*.md" --include="*.txt" --include="*.yml" --include="*.yaml" \
        2>/dev/null | grep -v "/private/" || true)

    if [ -n "$secret_files" ]; then
        found_issues=1
        while IFS= read -r f; do
            emit "SEC-003" "security" "warn" \
                "Possible secret in: ${f#$PRAXIS_TARGET_DIR/}" \
                "Review this file for hardcoded credentials"
        done <<< "$secret_files"
    fi

    # SEC-004: Connection strings (WARN)
    local conn_files
    conn_files=$(grep -rlE "(mysql|postgres|mongodb|redis)://[^@]+@" "$dev_dir" \
        --include="*.md" --include="*.txt" --include="*.yml" --include="*.yaml" \
        2>/dev/null | grep -v "/private/" || true)

    if [ -n "$conn_files" ]; then
        found_issues=1
        while IFS= read -r f; do
            emit "SEC-004" "security" "warn" \
                "Connection string with credentials: ${f#$PRAXIS_TARGET_DIR/}" \
                "Move connection strings to .env files"
        done <<< "$conn_files"
    fi

    # SEC-005: IP addresses with credentials (WARN)
    local ip_files
    ip_files=$(grep -rlE "[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" "$dev_dir" \
        --include="*.md" --include="*.txt" --include="*.yml" --include="*.yaml" \
        2>/dev/null | grep -v "/private/" || true)

    if [ -n "$ip_files" ]; then
        found_issues=1
        while IFS= read -r f; do
            emit "SEC-005" "security" "warn" \
                "Credentials with IP address: ${f#$PRAXIS_TARGET_DIR/}" \
                "Remove credentials from IP references"
        done <<< "$ip_files"
    fi

    if [ "$found_issues" -eq 0 ]; then
        emit "SEC-000" "security" "pass" "No secrets detected"
    fi
}

# --- Category 6: Source of Truth Consistency (SOT-001 to SOT-004) ---

check_sot_consistency() {
    print_header "Source of Truth Consistency"
    local dev_dir="$PRAXIS_TARGET_DIR/dev"
    local sot="$dev_dir/source_of_truth.md"

    [ -f "$sot" ] || return 0

    # SOT-001: Referenced dev/ folders exist
    local referenced_dirs
    referenced_dirs=$(grep -oE 'dev/[a-z_-]+/' "$sot" 2>/dev/null | sort -u || true)

    if [ -n "$referenced_dirs" ]; then
        local missing_count=0
        while IFS= read -r ref_dir; do
            local full_path="$PRAXIS_TARGET_DIR/$ref_dir"
            if [ ! -d "$full_path" ]; then
                emit "SOT-001" "sot_consistency" "warn" \
                    "SOT references $ref_dir but folder doesn't exist" \
                    "Create the folder or update source_of_truth.md"
                missing_count=$((missing_count + 1))
            fi
        done <<< "$referenced_dirs"

        if [ "$missing_count" -eq 0 ]; then
            emit "SOT-001" "sot_consistency" "pass" \
                "All SOT-referenced folders exist"
        fi
    fi

    # SOT-002: Tech stack config file hints (INFO)
    if grep -qEi "(next\.?js|react|typescript)" "$sot" 2>/dev/null; then
        if [ -f "$PRAXIS_TARGET_DIR/package.json" ]; then
            emit "SOT-002" "sot_consistency" "pass" \
                "SOT mentions JS/TS stack — package.json exists"
        else
            emit "SOT-002" "sot_consistency" "info" \
                "SOT mentions JS/TS stack but no package.json found" \
                "Add package.json or update SOT tech stack section"
        fi
    fi

    if grep -qEi "(python|django|flask|fastapi)" "$sot" 2>/dev/null; then
        if [ -f "$PRAXIS_TARGET_DIR/requirements.txt" ] || [ -f "$PRAXIS_TARGET_DIR/pyproject.toml" ]; then
            emit "SOT-002" "sot_consistency" "pass" \
                "SOT mentions Python stack — requirements file exists"
        else
            emit "SOT-002" "sot_consistency" "info" \
                "SOT mentions Python stack but no requirements.txt/pyproject.toml found" \
                "Add requirements file or update SOT tech stack section"
        fi
    fi

    # SOT-003: Triangle mode agent folders match
    if [ "$DETECTED_MODE" = "triangle" ]; then
        local wo_dir="$dev_dir/work-orders"
        local agent_dirs_found=0
        for agent_dir in "$wo_dir"/wo_*/; do
            [ -d "$agent_dir" ] && agent_dirs_found=$((agent_dirs_found + 1))
        done

        if [ "$agent_dirs_found" -ge 2 ]; then
            emit "SOT-003" "sot_consistency" "pass" \
                "Triangle mode: ${agent_dirs_found} agent WO folders found"
        else
            emit "SOT-003" "sot_consistency" "warn" \
                "Triangle mode detected but only ${agent_dirs_found} agent WO folder(s) found" \
                "Create wo_*/ folders for each agent in work-orders/"
        fi
    fi

    # SOT-004: Decisions Log has entries
    local decision_count
    decision_count=$(grep -cE '^\| [0-9]+ \|' "$sot" 2>/dev/null || echo 0)

    if [ "$decision_count" -gt 0 ]; then
        emit "SOT-004" "sot_consistency" "pass" \
            "Decisions Log has ${decision_count} entries"
    else
        emit "SOT-004" "sot_consistency" "info" \
            "Decisions Log is empty" \
            "Record project decisions in the SOT Decisions Log table"
    fi
}

# --- Category 7: Orphan Detection (OD-001 to OD-004) ---

check_orphans() {
    print_header "Orphan Detection"
    local dev_dir="$PRAXIS_TARGET_DIR/dev"
    local found_orphans=0

    # OD-001: Unexpected .md files at dev/ root
    for file in "$dev_dir"/*.md; do
        [ -f "$file" ] || continue
        local filename
        filename=$(basename "$file")

        # Allow core docs
        case "$filename" in
            source_of_truth.md|context_capsule.md|checkpoint.md) continue ;;
        esac

        found_orphans=1
        emit "OD-001" "orphan_detection" "warn" \
            "Unexpected file at dev/ root: $filename" \
            "Move to appropriate subfolder (research/, reports/draft/, etc.)"
    done

    # OD-002: Files directly in dev/reports/ root (should be in draft/ or published/)
    if [ -d "$dev_dir/reports" ]; then
        for file in "$dev_dir/reports"/*.md "$dev_dir/reports"/*.html; do
            [ -f "$file" ] || continue
            local filename
            filename=$(basename "$file")

            # Skip READMEs (they belong at folder roots)
            [[ "$filename" == *README* ]] && continue
            [[ "$filename" == 0_*_README* ]] && continue

            found_orphans=1
            emit "OD-002" "orphan_detection" "warn" \
                "File in reports/ root: $filename (should be in draft/ or published/)" \
                "Move to reports/draft/written/ or reports/draft/html/"
        done
    fi

    # OD-003: Unexpected html/ folders
    while IFS= read -r -d '' html_dir; do
        local relative="${html_dir#$dev_dir/}"

        # Allow known html/ locations
        case "$relative" in
            reports/draft/html|reports/published/html) continue ;;
        esac

        found_orphans=1
        emit "OD-003" "orphan_detection" "warn" \
            "Unexpected html/ folder: dev/$relative" \
            "Use reports/draft/html/ or reports/published/html/ instead"
    done < <(find "$dev_dir" -type d -name "html" -print0 2>/dev/null)

    # OD-004: Non-.md files in work-orders/ root
    if [ -d "$dev_dir/work-orders" ]; then
        for file in "$dev_dir/work-orders"/*; do
            [ -f "$file" ] || continue
            local filename
            filename=$(basename "$file")
            local ext="${filename##*.}"

            if [ "$ext" != "md" ]; then
                emit "OD-004" "orphan_detection" "info" \
                    "Non-.md file in work-orders/: $filename" \
                    "Work orders should be .md files"
            fi
        done
    fi

    if [ "$found_orphans" -eq 0 ]; then
        emit "OD-000" "orphan_detection" "pass" "No orphaned files detected"
    fi
}

# ─────────────────────────────────────────────────
# Layer 6: Summary + JSON Output
# ─────────────────────────────────────────────────

print_summary() {
    local total=$((COUNT_PASS + COUNT_WARN + COUNT_FAIL + COUNT_INFO))

    printf "\n${BOLD}Summary${RESET}\n"
    printf "  Checks: %d total\n" "$total"
    printf "  ${GREEN}PASS: %d${RESET} | ${YELLOW}WARN: %d${RESET} | ${RED}FAIL: %d${RESET} | ${CYAN}INFO: %d${RESET}\n" \
        "$COUNT_PASS" "$COUNT_WARN" "$COUNT_FAIL" "$COUNT_INFO"

    if [ ${#FAILURES[@]} -gt 0 ]; then
        printf "\n  ${RED}%d failure(s) must be fixed:${RESET}\n" "${#FAILURES[@]}"
        for msg in "${FAILURES[@]}"; do
            printf "    ${RED}-${RESET} %s\n" "$msg"
        done
    fi

    if [ ${#WARNINGS[@]} -gt 0 ] && [ "$PRAXIS_STRICT" -eq 1 ]; then
        printf "\n  ${YELLOW}%d warning(s) treated as failures (--strict mode):${RESET}\n" "${#WARNINGS[@]}"
        for msg in "${WARNINGS[@]}"; do
            printf "    ${YELLOW}-${RESET} %s\n" "$msg"
        done
    fi

    # Exit code preview
    local exit_code=0
    if [ "$COUNT_FAIL" -gt 0 ]; then
        exit_code=2
    elif [ "$COUNT_WARN" -gt 0 ] && [ "$PRAXIS_STRICT" -eq 1 ]; then
        exit_code=2
    elif [ "$COUNT_WARN" -gt 0 ]; then
        exit_code=1
    fi
    printf "\n  Exit code: "
    case "$exit_code" in
        0) printf "${GREEN}0${RESET}\n" ;;
        1) printf "${YELLOW}1${RESET}\n" ;;
        2) printf "${RED}2${RESET}\n" ;;
    esac
}

print_json_output() {
    local total=$((COUNT_PASS + COUNT_WARN + COUNT_FAIL + COUNT_INFO))
    local exit_code=0

    if [ "$COUNT_FAIL" -gt 0 ]; then
        exit_code=2
    elif [ "$COUNT_WARN" -gt 0 ] && [ "$PRAXIS_STRICT" -eq 1 ]; then
        exit_code=2
    elif [ "$COUNT_WARN" -gt 0 ]; then
        exit_code=1
    fi

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

    # Build JSON manually (no jq dependency)
    printf '{\n'
    printf '  "version": "%s",\n' "$PRAXIS_LINT_VERSION"
    printf '  "project": "%s",\n' "$PRAXIS_TARGET_DIR"
    printf '  "tier": "%s",\n' "$DETECTED_TIER"
    printf '  "mode": "%s",\n' "$DETECTED_MODE"
    printf '  "timestamp": "%s",\n' "$timestamp"
    printf '  "summary": {\n'
    printf '    "total": %d,\n' "$total"
    printf '    "pass": %d,\n' "$COUNT_PASS"
    printf '    "warn": %d,\n' "$COUNT_WARN"
    printf '    "fail": %d,\n' "$COUNT_FAIL"
    printf '    "info": %d\n' "$COUNT_INFO"
    printf '  },\n'
    printf '  "exit_code": %d,\n' "$exit_code"
    printf '  "findings": [\n'

    local i=0
    local count=${#FINDINGS[@]}
    for finding in "${FINDINGS[@]}"; do
        i=$((i + 1))
        if [ "$i" -lt "$count" ]; then
            printf '    %s,\n' "$finding"
        else
            printf '    %s\n' "$finding"
        fi
    done

    printf '  ]\n'
    printf '}\n'
}

# ─────────────────────────────────────────────────
# Layer 7: Main Orchestrator
# ─────────────────────────────────────────────────

run_auto_fix() {
    if [ "$PRAXIS_FIX" -eq 0 ] || [ ${#FIXABLE_DIRS[@]} -eq 0 ]; then
        return 0
    fi

    [ "$PRAXIS_JSON" -eq 0 ] && printf "\n${BOLD}Auto-Fix${RESET}\n"

    for dir in "${FIXABLE_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir" 2>/dev/null && {
                [ "$PRAXIS_JSON" -eq 0 ] && printf "  ${GREEN}[FIXED]${RESET} Created %s\n" "${dir#$PRAXIS_TARGET_DIR/}"
            }
        fi
    done
}

main() {
    parse_args "$@"
    setup_colors

    # Resolve target directory
    PRAXIS_TARGET_DIR=$(realpath "$PRAXIS_TARGET_DIR" 2>/dev/null || echo "$PRAXIS_TARGET_DIR")

    # Check if dev/ exists — graceful skip if not
    if [ ! -d "$PRAXIS_TARGET_DIR/dev" ]; then
        if [ "$PRAXIS_JSON" -eq 1 ]; then
            printf '{"version":"%s","project":"%s","tier":"none","mode":"none","summary":{"total":0,"pass":0,"warn":0,"fail":0,"info":0},"exit_code":0,"findings":[],"note":"No dev/ folder found"}\n' \
                "$PRAXIS_LINT_VERSION" "$PRAXIS_TARGET_DIR"
        else
            printf "${BOLD}Praxis Lint v%s${RESET}\n" "$PRAXIS_LINT_VERSION"
            printf "Project: %s\n" "$PRAXIS_TARGET_DIR"
            printf "\n  ${DIM}No dev/ folder found — skipping (may be gitignored).${RESET}\n"
            printf "  Run with --path to target a different directory.\n"
        fi
        exit 0
    fi

    # Detect tier and mode
    if [ "$PRAXIS_TIER" = "auto" ]; then
        DETECTED_TIER=$(detect_tier)
    else
        DETECTED_TIER="$PRAXIS_TIER"
    fi
    DETECTED_MODE=$(detect_triangle_mode)

    # Banner (human mode only)
    if [ "$PRAXIS_JSON" -eq 0 ]; then
        printf "${BOLD}Praxis Lint v%s${RESET}\n" "$PRAXIS_LINT_VERSION"
        printf "Project: %s\n" "$PRAXIS_TARGET_DIR"
        printf "Tier: %s%s | Mode: %s\n" \
            "$DETECTED_TIER" \
            "$([ "$PRAXIS_TIER" = "auto" ] && echo " (auto)" || echo "")" \
            "$DETECTED_MODE"
    fi

    # Run all check categories
    check_structure
    [ "$PRAXIS_SKIP_FRESHNESS" -eq 0 ] && check_freshness
    check_work_orders
    check_naming
    [ "$PRAXIS_SKIP_SECURITY" -eq 0 ] && check_security
    check_sot_consistency
    check_orphans

    # Auto-fix (runs after all checks)
    run_auto_fix

    # Output
    if [ "$PRAXIS_JSON" -eq 1 ]; then
        print_json_output
    else
        print_summary
    fi

    # Exit code
    if [ "$COUNT_FAIL" -gt 0 ]; then
        exit 2
    elif [ "$COUNT_WARN" -gt 0 ] && [ "$PRAXIS_STRICT" -eq 1 ]; then
        exit 2
    elif [ "$COUNT_WARN" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

main "$@"
