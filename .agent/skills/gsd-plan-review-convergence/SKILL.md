---
name: gsd-plan-review-convergence
description: Cross-AI plan convergence loop — replan with review feedback until no HIGH concerns remain (max 3 cycles)
---


<objective>
Cross-AI plan convergence loop — an outer revision gate around gsd-review and gsd-planner.
Repeatedly: review plans with external AI CLIs → if HIGH concerns found → replan with --reviews feedback → re-review. Stops when no HIGH concerns remain or max cycles reached.

**Flow:** Agent→Skill("gsd-plan-phase") → Agent→Skill("gsd-review") → check HIGHs → Agent→Skill("gsd-plan-phase --reviews") → Agent→Skill("gsd-review") → ... → Converge or escalate

Replaces gsd-plan-phase's internal gsd-plan-checker with external AI reviewers (codex, gemini, etc.). Each step runs inside an isolated Agent that calls the corresponding existing Skill — orchestrator only does loop control.

**Orchestrator role:** Parse arguments, validate phase, spawn Agents for existing Skills, check HIGHs, stall detection, escalation gate.
</objective>

<execution_context>
@.agent/get-shit-done/workflows/plan-review-convergence.md
@.agent/get-shit-done/references/revision-loop.md
@.agent/get-shit-done/references/gates.md
@.agent/get-shit-done/references/agent-contracts.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same interactive question API. Do not skip questioning steps because `AskUserQuestion` appears unavailable; use `vscode_askquestions` instead.
</runtime_note>

<context>
Phase number: extracted from $ARGUMENTS (required)

**Flags:**
- `--codex` — Use Codex CLI as reviewer (default if no reviewer specified)
- `--gemini` — Use Gemini CLI as reviewer
- `--claude` — Use the agent CLI as reviewer (separate session)
- `--opencode` — Use OpenCode as reviewer
- `--all` — Use all available CLIs
- `--max-cycles N` — Maximum replan→review cycles (default: 3)
</context>

<process>
Execute the plan-review-convergence workflow from @.agent/get-shit-done/workflows/plan-review-convergence.md end-to-end.
Preserve all workflow gates (pre-flight, revision loop, stall detection, escalation).
</process>
