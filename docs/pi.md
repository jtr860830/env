---
paths: ["config/pi/.config/pi/*", ".pi/extensions/**"]
---

## pi

### Directories

pi (`brew "pi-coding-agent"`) has no XDG handling: it builds every path from `~/.pi/agent` unless `PI_CODING_AGENT_DIR` is set, and upstream closed the XDG request as wontfix ([earendil-works/pi#2870](https://github.com/earendil-works/pi/issues/2870)). The two variables in `conf.d/env.fish` are therefore the permanent answer:

- `PI_CODING_AGENT_DIR=$XDG_CONFIG_HOME/pi` for settings, models, `auth.json`, prompts and agents;
- `PI_CODING_AGENT_SESSION_DIR=$XDG_DATA_HOME/pi/sessions`.

Sessions are DATA, not STATE. The XDG spec's STATE is for what is not important or portable enough for DATA, and pi treats sessions as the opposite: they are never pruned, compaction keeps the original entries, and they are named, searched, forked and exported.

Like the Go variables, these reach only processes started from fish. pi looks for `fd` and `rg` on `PATH` first, and both are in the brewfile, so it downloads neither.

### Local settings

`~/.config/pi/settings.json` stays local, as Claude's and Codex's do: pi writes it itself, including a device id, the last changelog version and the `packages` list that `pi install` maintains, and those writes would otherwise land in this public repo. `auth.json` and `trust.json` are credentials and a per-directory decision, also local. The hand-set values are listed in `.pi/skills/manual-setup/SKILL.md`. What stays there has no other home:

- `shellPath` has no extension API and no variable. Without it pi's `bash` tool runs `/bin/bash` 3.2, and models routinely write bash 4 and later; `brew "bash"` is in the brewfile for that.
- `defaultProvider` and `defaultModel` are what pi itself writes on a saved model switch.
- `modelThinkingLevels` could only be copied by an extension, a second implementation that `/settings` would then disagree with.

Two settings live in the repo instead and must not be set in that file: the editor's padding is fixed in `extensions/editor.ts`, and the hardware cursor comes from `PI_HARDWARE_CURSOR` in `env.fish` (`docs/pi-ui.md`). There is no `theme` key.

### pi is the harness

The main session runs on `claude-fable-5-2` through the `anthropic` provider (the company's API key). When that credit runs out the owner switches by hand with `/model` to the same model on `claude-code`, the Claude subscription through the `pi-claude-code` package, and continues. Nothing switches automatically: the main session always has a person in front of it.

OpenAI models use the ChatGPT subscription (`/login openai`, the `openai` provider). Codex CLI has no role in pi. Claude Code and Codex CLI are both still installed and runnable on their own.

**`pi-claude-code`, not `pi-claude-bridge`.** Both reach the Claude subscription through the `claude` binary. The bridge runs Claude Code with its own system prompt in front, its settings and hooks loaded and its session files written, which is what pi was adopted to get away from. `pi-claude-code` runs `claude -p` with pi's prompt as the system prompt, no tools, no setting sources and no session persistence, so the subscription path costs one fixed sentence and one small fixed message over the API path. It fails a turn rather than pay for extra usage. pi's own `/login anthropic` OAuth is not used, since it is billed per token and has no advantage over the API key.

### User-level context file

`~/.config/pi/AGENTS.md` (stowed) is the user-level context file: only the note on condensed command output, nothing about language or delegation. It loads in subagent children too.

User-level harness is mechanism, not policy. The `task` tool is available the way an operating system offers system calls, and when to delegate is left to what runs above it: delegation should be optional rather than the default working mode, and policy changes faster than mechanism. The accepted cost is that the main session delegates only when asked or when it judges the tool description applies. Each result carries the subagent's session id, so its transcript can be inspected. The extension itself is in `docs/pi-subagents.md`.

### Documents and how they load

**`AGENTS.md` is a map.** It holds what the repo is, the index, the rules for any change, and warnings whose trigger touches no documented path. Everything tied to one area is a document in `docs/`, a flat and harness-neutral directory that serves human readers as well as agents; the root is the git root. The index's "Loads when editing" column is checked against each document's frontmatter because Claude Code and Codex get no injection, and it is their only map from path to document. `scripts/check-docs.py` enforces the rules stated at the end of `AGENTS.md`; `just check-docs` runs it alone.

**Keep `paths` narrow.** A glob loads the whole document, so `docs/**` is in no document's `paths`, and a document that only one or two files need names those files.

**Document updates are asked for, not triggered.** An update belongs to a finished piece of work, which spans several commits or has none, so a diff is the wrong trigger. The owner asks, the model drafts from the conversation and the diffs, and the owner approves before it is written.

**pi has no path-scoped rules, so `.pi/extensions/rules.ts` provides them:**

- At `session_start` it walks up from the working directory to the nearest ancestor holding `.git`, reads `docs/*.md` non-recursively and parses each file's `paths` globs.
- The globs are turned into regular expressions by its own code. Node's `path.matchesGlob` cannot replace it: its `**` does not enter dot-directories, and every stowed path has a `.config` segment.
- On `read`, `edit` or `write` of a matching path it injects the document as a hidden `rule` message, once for as long as that message is in the context. `edit` and `write` are blocked the first time, with a reason telling the model the content is already in its context and to retry.
- **What counts as injected is rebuilt from the session**, from `buildContextEntries()` (the branch with compaction applied) at `session_start`, `session_compact` and `session_tree`, and a rule counts only when the entry holds the rule's current body. So a document that has left the context, or changed since it was injected, is injected again.
- Paths are resolved as pi's own tools resolve them, a leading `@` dropped and `~` expanded, and then through `realpath`, because every stowed file under `~` is a link into the repo. So `~/.config/fish/conf.d/env.fish` loads `docs/fish.md` and `docs/env.md`.
- **All rules hit by one tool batch go out as one message.** pi delivers queued messages one per turn, so separate messages would reach a subagent after it had written its report, and its answer to the last one would replace the report.
- It watches `docs/` and reloads on change, re-arming only the rules whose body changed.

Skills in `.pi/skills/` are discovered by pi natively.

Project resources under `.pi/` need project trust. `-p` cannot ask, so an untrusted headless run goes without the extension; `trust.json` holds the decision and `pi -p -a` approves for one run.

To test `rules.ts` without a model: copy it beside a `node_modules` link to pi's package and run it with `node`, with a stand-in `pi` that collects the handlers and a real `SessionManager` on a copy of a session file.
