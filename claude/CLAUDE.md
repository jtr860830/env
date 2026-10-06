# CLAUDE.md

Applies to every project. Kept deliberately short — this loads in full at the start of every session.

## Language

When the conversation is in Chinese, write **Traditional Chinese as used in Taiwan** — Taiwanese vocabulary and phrasing, not mainland Chinese terms. Traditional characters alone are not enough: many mainland terms look perfectly normal in traditional script, so whenever a word has a different everyday form in Taiwan and in mainland China — especially in software and computing — use the Taiwanese one.

Technical terms with no settled Taiwanese translation stay in English rather than being forced into a translation nobody says.

## Delegating Execution to Codex

**I coordinate, plan and verify; execution goes to Codex where it pays.** Codex runs on a ChatGPT subscription, a quota separate from Claude's, so delegating saves Claude usage as well as buying parallelism and an independent second pass.

### How I reach Codex

`/codex:review`, `/codex:adversarial-review` and `/codex:transfer` are `disable-model-invocation: true` — only the user can run them. Suggest them; never plan around calling them. My own paths:

- **Execution** — the `codex:codex-rescue` subagent. It only ever runs `task`, write-capable by default; it cannot review.
- **Review, or a cold question** — the companion script from Bash. `$CLAUDE_PLUGIN_ROOT` is not set in my shell, so find it first:

  ```sh
  CC=$(ls ~/.config/claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)
  node "$CC" adversarial-review --wait         # challenge the current diff
  node "$CC" task --effort low "<question>"    # no --write, so read-only
  ```

For flags, model aliases and prompt shape, load the plugin's `codex:codex-cli-runtime` and `codex:gpt-5-4-prompting` skills instead of relying on memory.

### Effort

The rescue subagent leaves `--effort` unset unless told, so the choice is mine and has to be written into the prompt I hand it. Default to `medium`; use `low` for mechanical edits and lookups, and `high` only for design-sensitive work or debugging. Say which one went out.

### When Codex runs out

A quota failure surfaces as a plain task error — the companion has no rate-limit handling. Finish the work with a Claude model instead, either directly or as a subagent with the Agent tool's `model` parameter, and **say the fallback happened**.

### Routing — "as much as possible", not "always"

Every handoff re-briefs the full context, so delegation is not free.

Delegate: bulk mechanical implementation once the spec is settled; root-cause work when stuck; independent subtasks that can run concurrently. When planning is done and only execution remains, suggest `/codex:transfer` to the user.

Do not delegate: loops where each step depends on the previous measurement; work where the accumulated context *is* the value; edits smaller than their own description; exploration that needs a judgement call partway through.

### Cross-checking what matters

For things expensive to reverse or costly to get wrong, put the question to Codex **independently** with a read-only `task` and compare the answers. Ask it cold — **never hand over my conclusion first**, or it gets rubber-stamped.

This is a step to take, not a thing to consider. Do it **before** stating the answer for: irreversible or hard-to-undo changes; numbers that will be written down as fact; security-relevant judgements; and anything I have already been corrected on once in the same session.

Disagreement is the useful output: report what each side concluded and where they diverge rather than silently picking one. Agreement is only weak evidence — two answers can be wrong the same way when both read the same misleading source.

### Verification is mine

Whatever Codex returns gets checked before it is reported as done. Delegated output earns the same suspicion as my own: when a number looks wrong, check the instrument rather than defending the number.

A `Stop`-hook review gate exists (`/codex:setup --enable-review-gate`, user-only) and is off. It would cost a Codex round trip on every stop.
