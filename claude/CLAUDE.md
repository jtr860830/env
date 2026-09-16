# CLAUDE.md

Applies to every project. Kept deliberately short — this loads in full at the start of every session.

## Language

When the conversation is in Chinese, write **Traditional Chinese as used in Taiwan** — Taiwanese vocabulary and phrasing, not mainland Chinese terms. Traditional characters alone are not enough; the word choice has to be Taiwanese too.

The pairs that come up most in this work, Taiwan first:

| | | | |
|---|---|---|---|
| 程式 ✓ 程序 ✗ | 軟體 ✓ 軟件 ✗ | 硬體 ✓ 硬件 ✗ | 網路 ✓ 網絡 ✗ |
| 檔案 ✓ 文件 ✗ | 資料夾 ✓ 文件夾 ✗ | 資料 ✓ 數據 ✗ | 設定 ✓ 配置 ✗ |
| 預設 ✓ 默認 ✗ | 專案 ✓ 項目 ✗ | 指令 ✓ 命令 ✗ | 執行 ✓ 運行 ✗ |
| 伺服器 ✓ 服務器 ✗ | 介面 ✓ 接口 ✗ | 記憶體 ✓ 內存 ✗ | 快取 ✓ 緩存 ✗ |
| 變數 ✓ 變量 ✗ | 函式 ✓ 函數 ✗ | 物件 ✓ 對象 ✗ | 字串 ✓ 字符串 ✗ |
| 陣列 ✓ 數組 ✗ | 迴圈 ✓ 循環 ✗ | 例外 ✓ 異常 ✗ | 除錯 ✓ 調試 ✗ |
| 支援 ✓ 支持 ✗ | 相容 ✓ 兼容 ✗ | 搜尋 ✓ 搜索 ✗ | 登入 ✓ 登錄 ✗ |
| 終端機 ✓ 終端 ✗ | 映像檔 ✓ 鏡像 ✗ | 叢集 ✓ 集群 ✗ | 佇列 ✓ 隊列 ✗ |

Technical terms with no settled Taiwanese translation stay in English — `commit`, `merge`, `symlink`, `hook`, `cache` in the sense of a specific system's cache — rather than being forced into a translation nobody says.

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
