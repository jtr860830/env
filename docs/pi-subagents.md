---
paths: ["config/pi/**/extensions/subagent/**", "config/pi/**/agents/**"]
---

## pi subagents

`config/pi/.config/pi/extensions/subagent/` is three files, `index.ts`, `fallback.ts` and `agents.ts`. It began as pi's official example (`examples/extensions/subagent/`) and is kept as files that can be read whole, so after a pi upgrade it can be compared with that example. pi itself ships no subagent feature. Why pi is the harness and why the user-level context file holds no delegation policy are in `docs/pi.md`.

### Names

Two words, two things. A *task* is one dispatched piece of work that is running; a *subagent* is the agent and the child process that carries it out. So the tools are `task` and `task_control`, the command is `/task`, the session types are `task-result` and `task-record`, and messages say "background task id". `PI_SUBAGENT`, the virtual model `subagent/<agent>`, the extension directory and the state directory name the agent or the extension and keep the other word. The tool's argument is `brief`, so that `task` does not name both the tool and what it is given.

### The `task` tool

- **Modes**: single (`agent` and `brief`) and parallel (`tasks: [{agent, brief}]`, at most 8, 4 at a time). An unknown agent or a malformed call is answered at once and never becomes a task.
- **Thinking level**: a per-task `thinking` parameter, then the agent file's `thinking:`, then what the child would otherwise get.
- **A per-task `model` override** names a physical model, and the fallback chain is then not used. That is how one `reviewer` file gives a cross-family review: dispatched twice, once with another family's model. Falling back from an override could put both reviews on the same family.
- **The tool description is built at registration from the user-level agent files**, listing each name and description. That list is how the main session chooses, so an agent's `description` is its routing rule: what it is for and what it is not for.
- **The description also states the contract of a background task**: until the result message arrives the caller knows nothing of the result, must not predict it, poll for it or redo the work, and may do other work, answer the user or end its turn; a parallel call is one task whose results arrive together. It describes the mechanism; it is not a policy on when to delegate.
- **Output**: a parallel member's output is cut at 50 KB on a UTF-8 character boundary. A single task's output has no cap, because a research report can be about that size.

### Execution

With a UI every call returns a background task id at once and the child keeps running. Without one (`-p`) the call runs in the foreground, because pi exits when the agent settles and would kill the task.

Background is the only mode because of how the owner works: while a subagent runs he keeps talking to the main session or walks away, and a foreground call leaves his input unseen in the queue. There is no tool that waits for a task, since blocking on a background task is the foreground mode again.

### Result delivery

| Situation | Sent as | Wakes the main session |
|---|---|---|
| task finished or failed | `task-result` message, `deliverAs: "followUp"`, `triggerTurn: true` | yes |
| finished after the owner pressed Escape and before his next input | plain `task-result` message | no |
| `/task kill` | plain `task-result` message: stopped by the user, output so far, session id | no |
| `task_control` `kill` | nothing; the output so far is the tool result | n/a |
| session shut down | nothing; reported at the next `session_start` | no |

- **The owner intervening by hand means the model does not start on its own.** He is present and has a plan; a wake could at best say "noted" and at worst dispatch again what he just killed. Other running tasks still wake the model when they finish.
- **Escape does not kill background tasks**: stopping the main session mid-thought should not throw away a worker's minutes. It holds wakes instead: `agent_settled` with `aborted: true` sets the hold and the `input` event clears it. Extension commands do not fire `input`, so `/task kill` leaves the hold in place.
- **"Plain" means `pi.sendMessage` without `triggerTurn` while the session is idle.** When it is not idle the message waits in a queue that `agent_settled` flushes. The queue exists because of how pi treats such a message: sent while idle it is displayed and persisted and starts no run; sent while streaming the model answers it in the same run; and `deliverAs: "nextTurn"` is neither displayed nor written to the session file until the next prompt, so quitting first would lose it.
- **Separate calls wake separately and a parallel call wakes once**; the description tells the model to choose by that.
- **Stopping returns a result instead of throwing**, so messages, usage and the session id survive, and a stopped parallel task reports each member as completed, failed or stopped.

### Control

- `/task` lists the running tasks and their members; `/task kill <id|all>` stops them.
- `task_control` gives the model the same list (`list`) and `kill`, which waits for the child to die and returns its output so far. It is there because the owner corrects direction while a task runs: the model kills the task whose brief has gone stale and dispatches again with a new one. The description says to use `list` when the user asks about progress, not to poll.
- Task ids come from a counter, which restarts on reload.

### Session records and shutdown

Each background task writes `task-record` entries with `pi.appendEntry` (outside the model's context) when it starts, when a child's session id is known and when it ends, keyed by id and start time because ids repeat after a reload.

`session_shutdown` fires for quit, `/reload`, `/new`, `/resume` and `/fork` and aborts every running task: the extension's task map dies with a reload, and after a switch the result would land in an unrelated session. At `session_start` the branch is scanned for tasks started and not ended; each gets an end record, and one plain message lists them with their session ids.

After `session_shutdown` the instance's `pi` and `ctx` are stale and every use of them throws, which in interactive mode ends pi. A `closed` flag set in `session_shutdown` therefore guards the status update, the record and the finish, and a call reads `ctx.cwd` once at its start.

### How a child ends

- A child ended by a signal the extension did not send is a failure that names the signal, and a process that cannot start reports the spawn error. In both cases `stopReason` becomes `error`.
- Stopping sends SIGTERM, then SIGKILL after 5 seconds if the process has neither exited nor closed. The check must not be `proc.killed`, which is true as soon as any signal has been sent.
- A chain with nothing left still exits 0, so failure is judged by `stopReason`, not by the exit code alone.

### Reading a child and the agent files

- The child's stdout and stderr are decoded with `setEncoding("utf8")`. Decoding chunk by chunk would break a character cut by a chunk boundary, which matters for long non-ASCII output.
- An agent file's `tools` and `fallback` may be a comma-separated string or a YAML list. Any other value gives none instead of throwing, so one bad file does not take the other agents out of discovery.
- Agents are discovered at user level only (`$PI_CODING_AGENT_DIR/agents`).

### Fallback

An agent file's `model` plus `fallback: [...]` is its chain. In a child (`PI_SUBAGENT` set) the extension registers nothing but `fallback.ts`: a virtual model `subagent/<agent>` whose `route()` returns the first usable model of the chain, and an `agent_before_settle` handler.

When the last assistant message is a quota error (the pattern at the top of `fallback.ts`: pi's own non-retryable list plus the two vendors' wording), the handler marks that provider spent, appends a hidden `subagent-fallback` message and returns `continue: true`. The next request goes through `route()` and lands on the next model, in the same process and the same session. Other errors do not switch models; pi already retries transient ones.

- **The handler is needed because pi treats quota errors as non-retryable**, so `route()` is never asked to retry them and the run would simply end. The appended message is what makes the context runnable; `continue: true` alone fails.
- **Continuing across vendors works** because pi skips errored assistant messages, drops another model's thinking and normalises tool calls. The new model loses the old one's reasoning and keeps every tool call, result and visible text.
- **Once switched, a child stays on the new model**; going back mid-task would lose the prompt cache a second time.
- **Spent providers are shared** through `$XDG_STATE_HOME/pi/extensions/subagent/exhausted-providers.json` (provider to expiry, 15 minutes). A new child skips a listed provider; after expiry the first child tries it again. The lifetime is fixed because the error text carries no reset time, and short because staying on the second subscription after the first has recovered spends the one that may be needed later. The key is the provider, not the model: a subscription's limit covers all its models.
- **The thinking level** comes from the parent, which passes the agent file's `thinking:` or a per-task value as `PI_SUBAGENT_THINKING`; `route()` applies it to whichever model it returns, so both models of a chain run at the same level.
- **The parent reports what happened** from the child's messages: the result says "ran on X after quota errors on Y" and carries one session id.

### Child identity and sessions

- The spawn sets `PI_SUBAGENT=<agent>`. The child then has no `task` tool, and its appended system prompt ends with a paragraph saying it is the named subagent of another pi session that reads only its final message, that it cannot delegate, and to do the task itself.
- A child keeps its session. The extension reads the id from the child's first event and ends each result with a line `session: <id>`. The transcript opens with `pi --session <id>`; the files are flat under `PI_CODING_AGENT_SESSION_DIR`.

### What the owner sees

- **Running tasks are status lines in the footer**, set with `ctx.ui.setStatus("subagent", …)` and drawn by `footer.ts` (`docs/pi-ui.md`). A single task is one line; a parallel task is a header line with its id and one line per member on `├` and `└`. A finished member stays, marked done, until its group ends. Name, model, turns and elapsed time are padded into columns, and a one-second timer keeps the elapsed time moving.
- **Icons** are `●` running, `✓` done and `✗` failed: each one cell wide and in Maple Mono, so the columns stay aligned.
- **A `task-result` message is rendered folded**, with a collapsed and an expanded view. The hint comes from the renderer's own `keyHint`, so it follows the configured key.
- "Last action" in a list is the last tool call issued, not necessarily the one executing; turns count a failed attempt.

### Agents

Agents are bundles of defaults (model, tools, fallback, report format), not roles; the role goes in the brief. Four cover the tool sets - read-only on disk (`scout`), the web (`researcher`), full tools (`worker`) and read-only judgement (`reviewer`) - and each file holds its own model, tools and chain. A stronger tier is a `model` override written into the agent's `description`, not a file of its own. What the files do not say:

- **Subagents run on subscriptions only.** The `anthropic` provider is the company's API key, billed per token, and is kept for the main session (`docs/pi.md`); no chain names it. OpenAI comes first for execution because that subscription is the owner's own; chains go OpenAI, then the Claude Code subscription. `reviewer` is Claude Opus on `claude-code` with no chain: it is a different family from the workers, and falling back to OpenAI would defeat that. Its default is Opus rather than Fable because it is the agent dispatched most and Fable spends several times the tokens for the same result.
- **Tiers are overrides, not files.** A hard case goes to `worker` with `openai/gpt-6.2-astra`, the hardest judgement to `reviewer` with `claude-code/claude-fable-5-2`, and a cross-family check to a second `reviewer` with `openai/gpt-6.2-astra`; both are named in the descriptions, since the description is all the main session sees. An override has no chain, so a quota failure comes back to the main session, which may dispatch again on `claude-code/claude-opus-5-5`; that is its judgement, not automatic escalation. One file per tier cost a description in every session for agents that were rarely dispatched, and `scout` absorbed running commands for the same reason: same tier, same tools, different report.
- **Every agent file pins `thinking:`**, and `worker`'s description asks for `thinking: high` with its override. With the level in the file, what a subagent does can be read from the repo alone, and it holds for a `model` override too; the local settings have no per-model table (`docs/pi.md`).
- **`worker` and `researcher` must report every obstacle**, worked around or not, because they run on GPT-6.2, whose system card says it omits obstacles from its reports more often than GPT-6 and that an explicit instruction reduces it; the main session reads only the report.
- **Descriptions and bodies are written as capabilities**, with coding as one example, so that a document or a plan is sent to `scout` or `reviewer` as readily as code. Every body says the report format the brief asks for wins over its own.
- **Routing**: where and how something is done, and "run this and say what happened", go to `scout`; anything that changes something to `worker`; judgement, on finished work or on a decision not yet taken, to `reviewer`. `scout` and `reviewer` have `bash`, so "read-only" is an instruction, not a tool restriction; each body holds two report formats and picks one when the brief does not.
- `--tools` can name extension tools such as `web_search` directly.

### Deliberately absent

Do not add these without the owner asking:

- **Chain mode, a wait tool, a resume parameter, steering a running child.** The orchestrator sequences calls itself, a follow-up goes out as a new brief carrying the earlier report, and a finished subagent can be continued by hand with `pi --session <id>`.
- **Project-scoped agents.** Agents are user-level only.
- **Anything that replaces the orchestrator's judgement with a mechanism**: a classifier choosing the agent, automatic escalation, merging near-simultaneous completions, a reminder to verify on every result.
- **Fallback for the main session.** The owner is present and switches by hand (`docs/pi.md`).
- **A live transcript viewer or a completion notification.** The session id is enough.
- **A community subagent package.** They are far larger, and this one is small enough to read whole.

### Costs

A background task's cost is not in the main session's totals: the `task` call returns before the child ends. It is in the folded result and in the child's own session. Each dispatch costs one short extra request, the reply that follows "Started background task". Report length matters more than either: a report stays in the main session's context for every later request.

### Testing

- **Type check**: `tsc -p` on a tsconfig kept outside the repo, with `strict`, `noImplicitOverride`, `moduleResolution: bundler` and `allowImportingTsExtensions`, listing the files to check. The `paths` that matter: `@earendil-works/pi-coding-agent` to its `dist/index.d.ts`, `@earendil-works/pi-ai` to `dist/core/extensions/pi-ai-extension-view.d.ts`, everything else to the package's `node_modules`. Confirm it can fail on a deliberately wrong file.
- **Headless**: `pi --mode json -p` with a cheap main model told to call the tool, reading `tool_execution_end`; and a child started the way the extension starts one (`PI_SUBAGENT=<agent> pi --mode json -p --model subagent/<agent> …`).
- **TUI**: pi in a Rex session of its own (`rex new <label> -c <scratch dir> -- pi …`, `docs/rex.md`), a cheap main model, a scratch working directory and session directory, driven with `rex send` and `rex send-key` and read with `rex capture`. Whether the main session woke is read from the session file as the number of assistant messages, not from the screen.
- **Process handling**: cut `runPi` out of `index.ts`, put stubs for what it imports in front, and run it with `node` against `node -e` children. A child pi shows in `ps` as `pi` with no arguments, so find it from its tool process and walk up to the process whose parent is the main pi.
