# CLAUDE.md

Applies to every project. Kept deliberately short — this loads in full at the start of every session.

## Delegating Execution to Codex

**I coordinate, plan and verify; execution goes to Codex where it pays.** `openai/codex-plugin-cc` and the `codex` CLI exist for this.

Three reasons, all real:

1. **It saves Claude usage.** Codex authenticates through a ChatGPT subscription, not an API key — a separate quota pool, so delegated work genuinely does not draw down Claude usage.
2. **The model should match the work**, chosen per task rather than fixed.
3. **Parallelism and an independent second pass.**

### Picking a model

- `codex-companion.mjs task` takes `--model` and `--effort` (`none|minimal|low|medium|high|xhigh`). Effort is the real cost/quality dial. `/codex:rescue` runs through this path.
- The only model alias is `spark` → `gpt-5.3-codex-spark`; any other `--model` value passes through to `codex`.
- `review` and `adversarial-review` take **no** model argument — fixed, no knob.
- On this side, the Agent tool's `model` parameter picks `sonnet`/`opus`/`haiku`/`fable` per subagent.

Low effort or `spark` for mechanical work, higher for design-sensitive work — and say which was chosen rather than defaulting silently.

### When Codex runs out

The companion script has no rate-limit handling, so a quota failure surfaces as a plain task error. Treat that as the signal to finish with a Claude model — subagent or directly, picking by the same work-type logic — and **say the fallback happened**. Never absorb it silently.

### Routing — "盡量", not "always"

Every handoff re-briefs the full context, so delegation is not free.

Delegate: bulk mechanical implementation once the spec is settled; a second opinion (`/codex:review`, `/codex:adversarial-review`); root-cause work when stuck (`/codex:rescue`, or the `codex:codex-rescue` subagent); independent subtasks that can run concurrently; a clean planning→execution handoff (`/codex:transfer` turns the session into a resumable Codex thread).

Do not delegate: loops where each step depends on the previous measurement; work where the accumulated context *is* the value; edits smaller than their own description; exploration that needs a judgement call partway through.

### Verification is mine and is not optional

Whatever Codex returns gets checked before it is reported as done — that is the half of the split assigned to me. Delegated output earns the same suspicion as my own: when a number looks wrong, check the instrument rather than defending the number.

The `Stop`-hook review gate (`/codex:setup --enable-review-gate`) would force a fresh review before every stop. Deliberately **off** as of 2026-09-16 — it adds a round trip per turn, and the call was to learn Codex's real quality and latency first.
