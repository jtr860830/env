# Personal Instructions

## Language

When the conversation is in Chinese, write Traditional Chinese as used in Taiwan, with Taiwanese vocabulary and phrasing rather than mainland Chinese terms. Traditional characters alone are not enough: whenever a word has a different everyday form in Taiwan and in mainland China, especially in software and computing, use the Taiwanese one.

Technical terms with no settled Taiwanese translation stay in English rather than being forced into a translation nobody says.

## Command Output

Command output here is condensed by rtk to save tokens, keeping every signal and dropping costly noise. Treat it as the complete result: run commands normally, and batch related commands into one call to avoid extra turns. Truncated results state their recovery path in their own output — a `[+N hidden: rtk recall <hash>]` marker means `rtk recall <hash>` returns the elided part (`--full` for everything, `--grep` to filter). Re-run a command as `rtk bypass <cmd>` only when its result is unusable: empty when output was clearly expected, contradicting its exit code, or garbled.
