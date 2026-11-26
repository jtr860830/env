import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentToolResult, ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { Message } from "@earendil-works/pi-ai";
import { StringEnum } from "@earendil-works/pi-ai";
import {
	type ExtensionAPI,
	type ExtensionContext,
	formatReadLineRange,
	getMarkdownTheme,
	type Theme,
	type ThemeColor,
} from "@earendil-works/pi-coding-agent";
import { Box, type Component, Container, Markdown, Spacer, Text, visibleWidth } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { type AgentConfig, discoverAgents, THINKING_LEVELS } from "./agents.ts";
import { fallbackModel, registerFallback } from "./fallback.ts";

const MAX_PARALLEL_TASKS = 8;
const MAX_CONCURRENCY = 4;
const COLLAPSED_ITEM_COUNT = 10;
const PER_TASK_OUTPUT_CAP = 50 * 1024;

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	return `${(count / 1000000).toFixed(1)}M`;
}

function formatUsageStats(
	usage: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		cost: number;
		contextTokens?: number;
		turns?: number;
	},
	model?: string,
): string {
	const parts: string[] = [];
	if (usage.turns) parts.push(`${usage.turns} turn${usage.turns > 1 ? "s" : ""}`);
	if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
	if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
	if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
	if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
	if (usage.cost) parts.push(`$${usage.cost.toFixed(4)}`);
	if (usage.contextTokens && usage.contextTokens > 0) {
		parts.push(`ctx:${formatTokens(usage.contextTokens)}`);
	}
	if (model) parts.push(model);
	return parts.join(" ");
}

function formatToolCall(
	toolName: string,
	args: Record<string, unknown>,
	themeFg: (color: ThemeColor, text: string) => string,
): string {
	const shortenPath = (p: string) => {
		const home = os.homedir();
		if (p === home) return "~";
		return p.startsWith(home + path.sep) ? `~${p.slice(home.length)}` : p;
	};

	switch (toolName) {
		case "bash": {
			const command = (args.command as string) || "...";
			const preview = command.length > 60 ? `${command.slice(0, 60)}...` : command;
			return themeFg("muted", "$ ") + themeFg("toolOutput", preview);
		}
		case "read": {
			const rawPath = (args.file_path || args.path || "...") as string;
			const filePath = shortenPath(rawPath);
			const lineRange = formatReadLineRange(args.offset, args.limit);
			let text = themeFg("accent", filePath);
			if (lineRange) {
				text += themeFg("warning", lineRange);
			}
			return themeFg("muted", "read ") + text;
		}
		case "write": {
			const rawPath = (args.file_path || args.path || "...") as string;
			const filePath = shortenPath(rawPath);
			const content = (args.content || "") as string;
			const lines = content.split("\n").length;
			let text = themeFg("muted", "write ") + themeFg("accent", filePath);
			if (lines > 1) text += themeFg("dim", ` (${lines} lines)`);
			return text;
		}
		case "edit": {
			const rawPath = (args.file_path || args.path || "...") as string;
			return themeFg("muted", "edit ") + themeFg("accent", shortenPath(rawPath));
		}
		case "ls": {
			const rawPath = (args.path || ".") as string;
			return themeFg("muted", "ls ") + themeFg("accent", shortenPath(rawPath));
		}
		case "find": {
			const pattern = (args.pattern || "*") as string;
			const rawPath = (args.path || ".") as string;
			return themeFg("muted", "find ") + themeFg("accent", pattern) + themeFg("dim", ` in ${shortenPath(rawPath)}`);
		}
		case "grep": {
			const pattern = (args.pattern || "") as string;
			const rawPath = (args.path || ".") as string;
			return (
				themeFg("muted", "grep ") +
				themeFg("accent", `/${pattern}/`) +
				themeFg("dim", ` in ${shortenPath(rawPath)}`)
			);
		}
		default: {
			const argsStr = JSON.stringify(args);
			const preview = argsStr.length > 50 ? `${argsStr.slice(0, 50)}...` : argsStr;
			return themeFg("accent", toolName) + themeFg("dim", ` ${preview}`);
		}
	}
}

interface UsageStats {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	contextTokens: number;
	turns: number;
}

interface SingleResult {
	agent: string;
	task: string;
	exitCode: number;
	messages: Message[];
	stderr: string;
	usage: UsageStats;
	model?: string;
	sessionId?: string;
	fallbackFrom?: string[];
	done?: boolean;
	stopReason?: string;
	errorMessage?: string;
}

interface SubagentDetails {
	mode: "single" | "parallel";
	results: SingleResult[];
}

function getFinalOutput(messages: Message[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg.role === "assistant") {
			for (const part of msg.content) {
				if (part.type === "text") return part.text;
			}
		}
	}
	return "";
}

function isFailedResult(result: SingleResult): boolean {
	return result.exitCode !== 0 || result.stopReason === "error" || result.stopReason === "aborted";
}

function getResultOutput(result: SingleResult): string {
	if (isFailedResult(result)) {
		return result.errorMessage || result.stderr || getFinalOutput(result.messages) || "(no output)";
	}
	return getFinalOutput(result.messages) || "(no output)";
}

function modelNote(result: SingleResult): string {
	if (!result.fallbackFrom?.length) return "";
	return ` (ran on ${result.model} after quota errors on ${result.fallbackFrom.join(", ")})`;
}

function sessionLine(result: SingleResult): string {
	return result.sessionId ? `\n\nsession: ${result.sessionId}` : "";
}

function modelLabel(r: SingleResult): string {
	const model = modelMark(r);
	return r.sessionId ? `${model || "?"} session:${r.sessionId}` : model;
}

function truncateParallelOutput(output: string): string {
	const bytes = Buffer.from(output, "utf8");
	if (bytes.length <= PER_TASK_OUTPUT_CAP) return output;

	let end = PER_TASK_OUTPUT_CAP;
	while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
	return `${bytes.toString("utf8", 0, end)}\n\n[Output truncated: ${bytes.length - end} bytes omitted. Full output preserved in tool details.]`;
}

type DisplayItem = { type: "text"; text: string } | { type: "toolCall"; name: string; args: Record<string, unknown> };

function getDisplayItems(messages: Message[]): DisplayItem[] {
	const items: DisplayItem[] = [];
	for (const msg of messages) {
		if (msg.role === "assistant") {
			for (const part of msg.content) {
				if (part.type === "text") items.push({ type: "text", text: part.text });
				else if (part.type === "toolCall") items.push({ type: "toolCall", name: part.name, args: part.arguments });
			}
		}
	}
	return items;
}

async function mapWithConcurrencyLimit<TIn, TOut>(
	items: TIn[],
	concurrency: number,
	fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
	if (items.length === 0) return [];
	const limit = Math.max(1, Math.min(concurrency, items.length));
	const results: TOut[] = new Array(items.length);
	let nextIndex = 0;
	const workers = Array.from({ length: limit }, async () => {
		while (true) {
			const current = nextIndex++;
			if (current >= items.length) return;
			results[current] = await fn(items[current], current);
		}
	});
	await Promise.all(workers);
	return results;
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) {
		return { command: process.execPath, args };
	}

	return { command: "pi", args };
}

type OnUpdateCallback = (partial: AgentToolResult<SubagentDetails>) => void;

interface RunOptions {
	agent: AgentConfig;
	brief: string;
	cwd: string;
	thinking?: ThinkingLevel;
	model?: string;
}

function emptyUsage(): UsageStats {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 };
}

function identitySuffix(agentName: string): string {
	return [
		"",
		"---",
		`You are running as the "${agentName}" subagent of another pi session. That session delegated this task to you and will read only your final message, so put everything it needs there.`,
		"You cannot delegate further: the task tool is not available here. Do the task yourself.",
	].join("\n");
}

interface ProcessOutcome {
	code: number | null;
	signal: NodeJS.Signals | null;
	error?: Error;
	aborted: boolean;
}

function runPi(
	args: string[],
	cwd: string,
	env: Record<string, string>,
	signal: AbortSignal | undefined,
	result: SingleResult,
	emit: () => void,
): Promise<ProcessOutcome> {
	return new Promise((resolve) => {
		const invocation = getPiInvocation(args);
		const proc = spawn(invocation.command, invocation.args, {
			cwd,
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, ...env },
		});
		let buffer = "";
		let aborted = false;
		let exited = false;
		let settled = false;
		let killTimer: NodeJS.Timeout | undefined;
		let failedModel: string | undefined;

		const processLine = (line: string) => {
			if (!line.trim()) return;
			let event: { type?: unknown; id?: unknown; message?: Message } | null;
			try {
				event = JSON.parse(line);
			} catch {
				return;
			}
			if (!event || typeof event !== "object") return;
			if (event.type === "session" && typeof event.id === "string") result.sessionId = event.id;
			if (event.type === "message_end" && event.message) {
				const msg = event.message;
				result.messages.push(msg);
				if (msg.role === "assistant") {
					result.usage.turns++;
					const usage = msg.usage;
					if (usage) {
						result.usage.input += usage.input || 0;
						result.usage.output += usage.output || 0;
						result.usage.cacheRead += usage.cacheRead || 0;
						result.usage.cacheWrite += usage.cacheWrite || 0;
						result.usage.cost += usage.cost?.total || 0;
						result.usage.contextTokens = usage.totalTokens || 0;
					}
					const ran = `${msg.provider}/${msg.model}`;
					if (failedModel && failedModel !== ran) {
						result.fallbackFrom = [...(result.fallbackFrom ?? []), failedModel];
					}
					failedModel = msg.stopReason === "error" ? ran : undefined;
					result.model = ran;
					result.stopReason = msg.stopReason;
					result.errorMessage = msg.errorMessage;
				}
				emit();
			}
		};

		proc.stdout.setEncoding("utf8");
		proc.stderr.setEncoding("utf8");
		proc.stdout.on("data", (data: string) => {
			buffer += data;
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";
			for (const line of lines) processLine(line);
		});
		proc.stderr.on("data", (data: string) => {
			result.stderr += data;
		});
		const killProc = () => {
			if (settled || exited || !proc.kill("SIGTERM")) return;
			aborted = true;
			killTimer = setTimeout(() => {
				if (!settled && !exited) proc.kill("SIGKILL");
			}, 5000);
		};
		const settle = (outcome: Omit<ProcessOutcome, "aborted">) => {
			if (settled) return;
			settled = true;
			clearTimeout(killTimer);
			signal?.removeEventListener("abort", killProc);
			resolve({ ...outcome, aborted });
		};

		proc.on("exit", () => {
			exited = true;
		});
		proc.on("close", (code, terminationSignal) => {
			if (buffer.trim()) processLine(buffer);
			settle({ code, signal: terminationSignal });
		});
		proc.on("error", (error) => settle({ code: null, signal: null, error }));

		if (signal?.aborted) killProc();
		else signal?.addEventListener("abort", killProc, { once: true });
	});
}

async function runSingleAgent(
	opts: RunOptions,
	signal: AbortSignal | undefined,
	onUpdate: (result: SingleResult) => void,
): Promise<SingleResult> {
	const { agent, brief, cwd } = opts;
	const virtualModel = opts.model === undefined ? fallbackModel(agent) : undefined;
	const physicalModel = opts.model ?? agent.model;
	const model = virtualModel ?? physicalModel;
	const thinkingLevel = opts.thinking ?? agent.thinking;

	const result: SingleResult = {
		agent: agent.name,
		task: brief,
		exitCode: 0,
		messages: [],
		stderr: "",
		usage: emptyUsage(),
		model: virtualModel ? undefined : physicalModel,
	};

	if (signal?.aborted) {
		result.stopReason = "aborted";
		result.done = true;
		return result;
	}

	const args = ["--mode", "json", "-p"];
	if (model) args.push("--model", model);
	if (thinkingLevel) args.push("--thinking", thinkingLevel);
	if (agent.tools?.length) args.push("--tools", agent.tools.join(","));
	args.push("--append-system-prompt", `${agent.systemPrompt.trim()}${identitySuffix(agent.name)}`, `Task: ${brief}`);

	const outcome = await runPi(args, cwd, { PI_SUBAGENT: agent.name }, signal, result, () => onUpdate(result));
	result.exitCode = outcome.code ?? 1;
	if (outcome.aborted) {
		result.stopReason = "aborted";
	} else if (outcome.error || outcome.signal) {
		result.stopReason = "error";
		result.errorMessage = outcome.error
			? `Subagent process failed: ${outcome.error.message}`
			: `Subagent was terminated by signal ${outcome.signal} before it finished.`;
	}
	result.done = true;
	return result;
}

const ThinkingSchema = StringEnum(THINKING_LEVELS, {
	description:
		"Thinking level for this run. Omit to use the agent's own setting. Lower it for lookups and routine edits, raise it for hard problems.",
});

const ModelSchema = Type.String({
	description:
		"Override the agent's model as provider/model-id, for example to get a second opinion from a different model family. The agent's fallback chain is not used when this is set.",
});

const TaskItem = Type.Object({
	agent: Type.String({ description: "Name of the agent to invoke" }),
	brief: Type.String({ description: "The brief for this agent" }),
	cwd: Type.Optional(Type.String({ description: "Working directory for the agent process" })),
	thinking: Type.Optional(ThinkingSchema),
	model: Type.Optional(ModelSchema),
});

const SubagentParams = Type.Object({
	agent: Type.Optional(Type.String({ description: "Name of the agent to invoke (for single mode)" })),
	brief: Type.Optional(Type.String({ description: "The brief for the agent (single mode)" })),
	tasks: Type.Optional(Type.Array(TaskItem, { description: "Array of {agent, brief} for parallel execution" })),
	cwd: Type.Optional(Type.String({ description: "Working directory for the agent process (single mode)" })),
	thinking: Type.Optional(ThinkingSchema),
	model: Type.Optional(ModelSchema),
});

const TaskControlParams = Type.Object({
	action: StringEnum(["list", "kill"] as const, {
		description: "list: the state of every running background task. kill: terminate one and get its output so far.",
	}),
	id: Type.Optional(Type.String({ description: "Background task id to kill, or `all`. Required for kill." })),
});

type StoppedBy = "user" | "model" | "shutdown";

interface BackgroundTask {
	id: string;
	key: string;
	summary: string;
	group: string;
	startedAt: number;
	controller: AbortController;
	sessions: Set<string>;
	stoppedBy?: StoppedBy;
	partial?: AgentToolResult<SubagentDetails>;
	result?: AgentToolResult<SubagentDetails>;
	promise: Promise<AgentToolResult<SubagentDetails>>;
}

type TaskRecord =
	| { event: "started"; key: string; id: string; summary: string }
	| { event: "session"; key: string; sessionId: string }
	| { event: "ended"; key: string; reason: "completed" | "failed" | "session-closed" | StoppedBy };

const RESULT_MESSAGE = "task-result";
const TASK_RECORD = "task-record";

function outputSoFar(result: AgentToolResult<SubagentDetails> | undefined): string {
	if (!result) return "(no output)";
	const results = result.details?.results ?? [];
	if (results.length === 0) return resultText(result);
	return results
		.map((r) => {
			const stopped = !r.done || r.stopReason === "aborted";
			const state = stopped ? "stopped" : isFailedResult(r) ? "failed" : "completed";
			const output = stopped ? getFinalOutput(r.messages) || "(no output)" : getResultOutput(r);
			const head = results.length > 1 ? `### [${r.agent}] ${state}\n\n` : "";
			return `${head}${truncateParallelOutput(output)}${sessionLine(r)}`;
		})
		.join("\n\n---\n\n");
}

function lastAction(r: SingleResult): string {
	const item = getDisplayItems(r.messages).at(-1);
	if (!item) return "starting";
	if (item.type === "toolCall") return formatToolCall(item.name, item.args, (_color, text) => text);
	return shortTask(item.text, 60);
}

function memberState(r: SingleResult): "running" | "done" | "failed" {
	return !r.done ? "running" : isFailedResult(r) ? "failed" : "done";
}

function fallbackMark(r: SingleResult): string {
	return r.fallbackFrom?.length ? `(fallback #${r.fallbackFrom.length})` : "";
}

function modelMark(r: SingleResult): string {
	return [r.model, fallbackMark(r)].filter(Boolean).join(" ");
}

function formatElapsed(ms: number): string {
	const seconds = Math.round(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
	return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

interface StatusRow {
	branch: "" | "├" | "└";
	header: boolean;
	state: "running" | "done" | "failed";
	name: string;
	model: string;
	fallback: string;
	turns: number | undefined;
	elapsed: string;
	tail: string;
}

function statusRows(bg: BackgroundTask): StatusRow[] {
	const results = bg.partial?.details?.results ?? [];
	const elapsed = formatElapsed(Date.now() - bg.startedAt);
	const blank = { branch: "", header: false, state: "running", model: "", fallback: "", turns: undefined, elapsed: "" } as const;
	if (results.length === 0) {
		return [bg.group ? { ...blank, header: true, name: bg.id, tail: "starting" } : { ...blank, name: bg.id, elapsed, tail: "starting" }];
	}
	const members = results.map((r, index): StatusRow => {
		const state = memberState(r);
		return {
			branch: bg.group ? (index === results.length - 1 ? "└" : "├") : "",
			header: false,
			state,
			name: bg.group ? r.agent : bg.id,
			model: r.model ?? "",
			fallback: fallbackMark(r),
			turns: r.usage.turns,
			elapsed: state === "running" ? elapsed : "",
			tail: state === "running" ? shortTask(lastAction(r), 60) : state,
		};
	});
	return bg.group ? [{ ...blank, header: true, name: bg.id, tail: "" }, ...members] : members;
}

const STATE_ICON = {
	running: { glyph: "●", color: "accent" },
	done: { glyph: "✓", color: "success" },
	failed: { glyph: "✗", color: "error" },
} as const;

function formatStatus(rows: StatusRow[], theme: Theme): string {
	const members = rows.filter((row) => !row.header);
	const digits = Math.max(0, ...members.map((row) => String(row.turns ?? "").length));
	const turns = (row: StatusRow) =>
		row.turns === undefined ? "" : `${String(row.turns).padStart(digits)} ${row.turns === 1 ? "turn" : "turns"}`;
	const lead = (row: StatusRow) => `${row.branch ? `${row.branch} ` : ""}${STATE_ICON[row.state].glyph} ${row.name}`;
	const styledLead = (row: StatusRow) => {
		const icon = STATE_ICON[row.state];
		const branch = row.branch ? `${theme.fg("borderMuted", row.branch)} ` : "";
		return `${branch}${theme.fg(icon.color, icon.glyph)} ${theme.fg("text", row.name)}`;
	};
	const columns: { plain: (row: StatusRow) => string; styled: (row: StatusRow) => string; right?: boolean }[] = [
		{ plain: lead, styled: styledLead },
		{
			plain: (row) => [row.model, row.fallback].filter(Boolean).join(" "),
			styled: (row) =>
				[row.model && theme.fg("muted", row.model), row.fallback && theme.fg("warning", row.fallback)]
					.filter(Boolean)
					.join(" "),
		},
		{ plain: turns, styled: (row) => theme.fg("muted", turns(row)) },
		{ plain: (row) => row.elapsed, styled: (row) => theme.fg("muted", row.elapsed), right: true },
	];
	const shown = columns
		.map((column) => ({ ...column, width: Math.max(0, ...members.map((row) => visibleWidth(column.plain(row)))) }))
		.filter((column) => column.width > 0);
	return rows
		.map((row) => {
			if (row.header) return [styledLead(row), row.tail && theme.fg("muted", row.tail)].filter(Boolean).join("  ");
			const cells = shown.map((column) => {
				const pad = " ".repeat(column.width - visibleWidth(column.plain(row)));
				return column.right ? pad + column.styled(row) : column.styled(row) + pad;
			});
			return [...cells, theme.fg("muted", row.tail)].join("  ");
		})
		.join("\n");
}

function describeTask(bg: BackgroundTask): string {
	const elapsed = formatElapsed(Date.now() - bg.startedAt);
	const members = (bg.partial?.details?.results ?? []).map((r) => {
		const session = r.sessionId ? `  session: ${r.sessionId}` : "";
		return `  ${r.agent}  ${memberState(r)}  ${modelMark(r) || "?"}  ${r.usage.turns} turns  last: ${lastAction(r)}${session}`;
	});
	return [`${bg.id}  ${bg.summary}  running ${elapsed}`, ...members].join("\n");
}

function resultText(result: AgentToolResult<SubagentDetails>): string {
	return result.content
		.map((c) => (c.type === "text" ? c.text : "(image)"))
		.join("\n")
		.trim();
}

function modelsLine(result: AgentToolResult<SubagentDetails>): string {
	const models = (result.details?.results ?? [])
		.map((r) => `${r.agent}: ${modelMark(r) || "?"}`)
		.join(", ");
	return models ? ` [${models}]` : "";
}

function shortTask(task: string | undefined, max = 50): string {
	const t = (task ?? "").replace(/\s+/g, " ").trim();
	return t.length > max ? `${t.slice(0, max)}...` : t;
}

function expandHint(theme: Theme, keyHint: (keybinding: "app.tools.expand", description: string) => string): string {
	return `${theme.fg("muted", "(")}${keyHint("app.tools.expand", "to expand")}${theme.fg("muted", ")")}`;
}

function renderDetails(details: SubagentDetails, expanded: boolean, theme: Theme, hint: string): Component {
	const mdTheme = getMarkdownTheme();

	const renderDisplayItems = (items: DisplayItem[], limit: number) => {
		const toShow = items.slice(-limit);
		const skipped = items.length - toShow.length;
		let text = "";
		if (skipped > 0) text += theme.fg("muted", `... ${skipped} earlier items\n`);
		for (const item of toShow) {
			if (item.type === "text") {
				const preview = item.text.split("\n").slice(0, 3).join("\n");
				text += `${theme.fg("toolOutput", preview)}\n`;
			} else {
				text += `${theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme))}\n`;
			}
		}
		return text.trimEnd();
	};

	const addMemberOutput = (container: Container, r: SingleResult) => {
		const items = getDisplayItems(r.messages);
		if (details.mode === "single" && items.length === 0)
			container.addChild(new Text(theme.fg("muted", "(no output)"), 0, 0));
		for (const item of items) {
			if (item.type === "toolCall") {
				const call = formatToolCall(item.name, item.args, theme.fg.bind(theme));
				container.addChild(new Text(theme.fg("muted", "→ ") + call, 0, 0));
			}
		}
		const finalOutput = getFinalOutput(r.messages);
		if (finalOutput) {
			container.addChild(new Spacer(1));
			container.addChild(new Markdown(finalOutput.trim(), 0, 0, mdTheme));
		}
		const usage = formatUsageStats(r.usage, modelLabel(r));
		if (usage) {
			if (details.mode === "single") container.addChild(new Spacer(1));
			container.addChild(new Text(theme.fg("dim", usage), 0, 0));
		}
	};

	if (details.mode === "single" && details.results.length === 1) {
		const r = details.results[0];
		const isError = isFailedResult(r);
		const icon = isError ? theme.fg("error", "✗") : theme.fg("success", "✓");

		if (expanded) {
			const container = new Container();
			let header = `${icon} ${theme.fg("toolTitle", theme.bold(r.agent))}`;
			if (isError && r.stopReason) header += ` ${theme.fg("error", `[${r.stopReason}]`)}`;
			container.addChild(new Text(header, 0, 0));
			if (isError && r.errorMessage)
				container.addChild(new Text(theme.fg("error", `Error: ${r.errorMessage}`), 0, 0));
			container.addChild(new Spacer(1));
			container.addChild(new Text(theme.fg("muted", "─── Task ───"), 0, 0));
			container.addChild(new Text(theme.fg("dim", r.task), 0, 0));
			container.addChild(new Spacer(1));
			container.addChild(new Text(theme.fg("muted", "─── Output ───"), 0, 0));
			addMemberOutput(container, r);
			return container;
		}

		const displayItems = getDisplayItems(r.messages);
		let text = `${icon} ${theme.fg("toolTitle", theme.bold(r.agent))}`;
		if (isError && r.stopReason) text += ` ${theme.fg("error", `[${r.stopReason}]`)}`;
		if (isError && r.errorMessage) text += `\n${theme.fg("error", `Error: ${r.errorMessage}`)}`;
		else if (displayItems.length === 0) text += `\n${theme.fg("muted", "(no output)")}`;
		else {
			text += `\n${renderDisplayItems(displayItems, COLLAPSED_ITEM_COUNT)}`;
			if (displayItems.length > COLLAPSED_ITEM_COUNT) text += `\n${hint}`;
		}
		const usageStr = formatUsageStats(r.usage, modelLabel(r));
		if (usageStr) text += `\n${theme.fg("dim", usageStr)}`;
		return new Text(text, 0, 0);
	}

	const aggregateUsage = (results: SingleResult[]) => {
		const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 };
		for (const r of results) {
			total.input += r.usage.input;
			total.output += r.usage.output;
			total.cacheRead += r.usage.cacheRead;
			total.cacheWrite += r.usage.cacheWrite;
			total.cost += r.usage.cost;
			total.turns += r.usage.turns;
		}
		return total;
	};

	if (details.mode === "parallel") {
		const successCount = details.results.filter((r) => !isFailedResult(r)).length;
		const icon = successCount < details.results.length ? theme.fg("warning", "◉") : theme.fg("success", "✓");
		const status = `${successCount}/${details.results.length} tasks`;

		if (expanded) {
			const container = new Container();
			container.addChild(
				new Text(
					`${icon} ${theme.fg("toolTitle", theme.bold("parallel "))}${theme.fg("accent", status)}`,
					0,
					0,
				),
			);

			for (const r of details.results) {
				const rIcon = isFailedResult(r) ? theme.fg("error", "✗") : theme.fg("success", "✓");

				container.addChild(new Spacer(1));
				container.addChild(
					new Text(`${theme.fg("muted", "─── ") + theme.fg("accent", r.agent)} ${rIcon}`, 0, 0),
				);
				container.addChild(new Text(theme.fg("muted", "Task: ") + theme.fg("dim", r.task), 0, 0));
				addMemberOutput(container, r);
			}

			const usageStr = formatUsageStats(aggregateUsage(details.results));
			if (usageStr) {
				container.addChild(new Spacer(1));
				container.addChild(new Text(theme.fg("dim", `Total: ${usageStr}`), 0, 0));
			}
			return container;
		}

		let text = `${icon} ${theme.fg("toolTitle", theme.bold("parallel "))}${theme.fg("accent", status)}`;
		for (const r of details.results) {
			const rIcon = isFailedResult(r) ? theme.fg("error", "✗") : theme.fg("success", "✓");
			const displayItems = getDisplayItems(r.messages);
			text += `\n\n${theme.fg("muted", "─── ")}${theme.fg("accent", r.agent)} ${rIcon}`;
			if (displayItems.length === 0) text += `\n${theme.fg("muted", "(no output)")}`;
			else text += `\n${renderDisplayItems(displayItems, 5)}`;
		}
		const usageStr = formatUsageStats(aggregateUsage(details.results));
		if (usageStr) text += `\n\n${theme.fg("dim", `Total: ${usageStr}`)}`;
		text += `\n${hint}`;
		return new Text(text, 0, 0);
	}

	return new Text("(no output)", 0, 0);
}

export default function (pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT) {
		registerFallback(pi, process.env.PI_SUBAGENT);
		return;
	}

	const backgroundTasks = new Map<string, BackgroundTask>();
	const quiet: { customType: string; content: string; display: boolean; details?: SubagentDetails }[] = [];
	let taskCount = 0;
	let held = false;
	let closed = false;
	let current: ExtensionContext | undefined;
	let ticker: NodeJS.Timeout | undefined;

	const agentCatalog = () => {
		const agents = discoverAgents();
		if (agents.length === 0) return "(no agents defined)";
		return agents.map((a) => `- ${a.name}: ${a.description}`).join("\n");
	};

	const updateStatus = () => {
		if (closed || !current?.hasUI) return;
		const running = [...backgroundTasks.values()];
		if (running.length === 0) {
			clearInterval(ticker);
			ticker = undefined;
			current.ui.setStatus("subagent", undefined);
			return;
		}
		ticker ??= setInterval(updateStatus, 1000);
		current.ui.setStatus("subagent", formatStatus(running.flatMap(statusRows), current.ui.theme));
	};

	async function runTasks(
		tasks: RunOptions[],
		mode: SubagentDetails["mode"],
		signal: AbortSignal | undefined,
		onUpdate: OnUpdateCallback | undefined,
	): Promise<AgentToolResult<SubagentDetails>> {
		const update = (results: SingleResult[]) => onUpdate?.({ content: [], details: { mode, results } });

		if (mode === "parallel") {
			const allResults: SingleResult[] = tasks.map((t) => ({
				agent: t.agent.name,
				task: t.brief,
				exitCode: 0,
				messages: [],
				stderr: "",
				usage: emptyUsage(),
			}));

			const results = await mapWithConcurrencyLimit(tasks, MAX_CONCURRENCY, async (t, index) => {
				const updateMember = (r: SingleResult) => {
					allResults[index] = r;
					update([...allResults]);
				};
				const result = await runSingleAgent(t, signal, updateMember);
				updateMember(result);
				return result;
			});

			const successCount = results.filter((r) => !isFailedResult(r)).length;
			const summaries = results.map((r) => {
				const output = truncateParallelOutput(getResultOutput(r));
				const status = isFailedResult(r)
					? `failed${r.stopReason && r.stopReason !== "end" ? ` (${r.stopReason})` : ""}`
					: "completed";
				return `### [${r.agent}] ${status}${modelNote(r)}\n\n${output}${sessionLine(r)}`;
			});
			return {
				content: [{ type: "text", text: `Parallel: ${successCount}/${results.length} succeeded\n\n${summaries.join("\n\n---\n\n")}` }],
				details: { mode, results },
			};
		}

		const result = await runSingleAgent(tasks[0], signal, (r) => update([r]));
		const details = { mode, results: [result] };
		if (isFailedResult(result)) {
			return {
				content: [{ type: "text", text: `Agent ${result.stopReason || "failed"}${modelNote(result)}: ${getResultOutput(result)}${sessionLine(result)}` }],
				details,
				isError: true,
			};
		}
		return {
			content: [{ type: "text", text: `${getFinalOutput(result.messages) || "(no output)"}${modelNote(result) ? `\n\n_${modelNote(result).trim()}_` : ""}${sessionLine(result)}` }],
			details,
		};
	}

	const record = (data: TaskRecord) => {
		if (!closed) pi.appendEntry(TASK_RECORD, data);
	};

	const sendQuiet = (content: string, details?: SubagentDetails) => {
		const message = { customType: RESULT_MESSAGE, content, display: true, details };
		if (!current || current.isIdle()) pi.sendMessage(message);
		else quiet.push(message);
	};

	const stop = (bg: BackgroundTask, by: StoppedBy) => {
		bg.stoppedBy ??= by;
		bg.controller.abort();
	};

	const finish = (bg: BackgroundTask, result: AgentToolResult<SubagentDetails>) => {
		bg.result = result;
		backgroundTasks.delete(bg.id);
		if (closed || bg.stoppedBy === "shutdown") return;
		updateStatus();
		record({ event: "ended", key: bg.key, reason: bg.stoppedBy ?? (result.isError ? "failed" : "completed") });
		if (bg.stoppedBy === "model") return;

		const label = `Background task ${bg.id} (${bg.summary})`;
		if (bg.stoppedBy === "user") {
			sendQuiet(
				`${label} was stopped by the user before it finished. Output so far:\n\n${outputSoFar(result)}`,
				result.details,
			);
			return;
		}
		const content = `${label} ${result.isError ? "failed" : "finished"}${modelsLine(result)}:\n\n${resultText(result)}`;
		if (held) {
			sendQuiet(content, result.details);
			return;
		}
		pi.sendMessage(
			{ customType: RESULT_MESSAGE, content, display: true, details: result.details },
			{ deliverAs: "followUp", triggerTurn: true },
		);
	};

	pi.on("session_start", async (_event, ctx) => {
		current = ctx;
		closed = false;
		const open = new Map<string, { id: string; summary: string; sessions: string[] }>();
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || entry.customType !== TASK_RECORD) continue;
			const data = entry.data as TaskRecord | undefined;
			if (!data) continue;
			if (data.event === "started") open.set(data.key, { id: data.id, summary: data.summary, sessions: [] });
			else if (data.event === "session") open.get(data.key)?.sessions.push(data.sessionId);
			else open.delete(data.key);
		}
		if (open.size === 0) return;

		const lines: string[] = [];
		for (const [key, task] of open) {
			record({ event: "ended", key, reason: "session-closed" });
			const sessions = task.sessions.length ? `, session: ${task.sessions.join(", ")}` : "";
			lines.push(`- ${task.id} (${task.summary})${sessions}`);
		}
		pi.sendMessage({
			customType: RESULT_MESSAGE,
			content: `These background tasks were terminated when the session was closed or reloaded, before they finished:\n${lines.join("\n")}`,
			display: true,
		});
	});

	pi.on("session_shutdown", async () => {
		closed = true;
		for (const bg of backgroundTasks.values()) stop(bg, "shutdown");
		clearInterval(ticker);
		ticker = undefined;
		if (current?.hasUI) current.ui.setStatus("subagent", undefined);
	});

	pi.registerMessageRenderer<SubagentDetails>(RESULT_MESSAGE, (message, { expanded, outputPad, keyHint }, theme) => {
		const details = message.details;
		if (!details || details.results.length === 0) return undefined;
		const head = typeof message.content === "string" ? message.content.split("\n", 1)[0] : "";
		const box = new Box(outputPad, 0);
		if (head) box.addChild(new Text(theme.fg("muted", head), 0, 0));
		box.addChild(renderDetails(details, expanded, theme, expandHint(theme, keyHint)));
		return box;
	});

	pi.on("agent_settled", async (event, ctx) => {
		current = ctx;
		if (event.aborted) held = true;
		for (const message of quiet.splice(0)) pi.sendMessage(message);
	});

	pi.on("input", async () => {
		held = false;
	});

	pi.registerCommand("task", {
		description: "List background tasks, or `kill <id|all>`",
		handler: async (args, ctx) => {
			current = ctx;
			const [verb, target] = (args ?? "").trim().split(/\s+/);
			const running = [...backgroundTasks.values()];
			if (verb === "kill") {
				const victims = running.filter((bg) => target === "all" || bg.id === target);
				for (const bg of victims) stop(bg, "user");
				ctx.ui.notify(victims.length ? `Killed ${victims.map((bg) => bg.id).join(", ")}` : "Nothing to kill", "info");
				return;
			}
			ctx.ui.notify(running.length ? running.map(describeTask).join("\n") : "No background tasks", "info");
		},
	});

	pi.registerTool({
		name: "task_control",
		label: "Task control",
		description: [
			"Inspect or kill the background tasks started by the task tool.",
			"list reports each running task's model, turns, elapsed time, last action and session id. Use it when the user asks how a task is going, not to poll for results: those arrive on their own.",
			"kill terminates a task whose brief is obsolete and returns its output so far. Start a new task with a corrected brief if the work is still needed.",
		].join("\n"),
		parameters: TaskControlParams,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			current = ctx;
			const running = [...backgroundTasks.values()];
			const reply = (text: string) => ({ content: [{ type: "text" as const, text }], details: {} });

			if (params.action === "list") {
				return reply(running.length ? running.map(describeTask).join("\n\n") : "No background tasks are running.");
			}

			const victims = running.filter((bg) => params.id === "all" || bg.id === params.id);
			if (victims.length === 0) {
				const ids = running.map((bg) => bg.id).join(", ") || "none";
				return reply(`No running background task matches "${params.id ?? ""}". Running: ${ids}.`);
			}
			for (const bg of victims) stop(bg, "model");
			await Promise.all(victims.map((bg) => bg.promise));
			return reply(
				victims
					.map((bg) => `Killed ${bg.id} (${bg.summary}). Output so far:\n\n${outputSoFar(bg.result)}`)
					.join("\n\n---\n\n"),
			);
		},
	});

	pi.registerTool({
		name: "task",
		label: "Task",
		description: [
			"Delegate a task to a subagent: a separate pi process with its own context window, model and tools.",
			"The subagent sees nothing of this conversation. Its brief must be self-contained: goal, exact files or symbols, constraints, what done looks like, and the report format you want back. Only its final message comes back to you. Each result ends with the subagent's session id; its full transcript is kept and opens with `pi --session <id>`.",
			"Agents are bundles of defaults (model, tools, report format), not roles: give the role in the brief. A merger is a worker told to merge; a critic is a reviewer told what to criticise.",
			"Modes: single (agent + brief), parallel (tasks, independent and touching disjoint files). Each task takes an optional thinking level and model override.",
			"In an interactive session a call returns a background task id at once and the subagent keeps running; its result arrives later as a message that wakes you. Until that message arrives you know nothing of the result: do not predict or describe it, do not poll for it, and do not redo the delegated work yourself. Do other work, answer the user, or end your turn. A parallel call is one task whose results arrive together, so use it for results you need side by side and separate calls for independent work. In print mode the call waits and returns the result directly.",
			"Available agents:",
			agentCatalog(),
		].join("\n"),
		parameters: SubagentParams,

		execute: async function runCall(_toolCallId, params, signal, onUpdate, ctx): Promise<AgentToolResult<SubagentDetails>> {
			const { agent, brief, tasks: parallel = [], ...options } = params;
			const single = agent && brief ? { agent, brief, ...options } : undefined;
			const agents = discoverAgents();
			const available = agents.map((a) => a.name).join(", ") || "none";
			if (Boolean(single) === (parallel.length > 0)) {
				return {
					content: [{ type: "text", text: `Invalid parameters. Provide exactly one mode: agent + brief, or tasks.\nAvailable agents: ${available}` }],
					details: { mode: "single", results: [] },
				};
			}
			if (parallel.length > MAX_PARALLEL_TASKS) {
				return {
					content: [{ type: "text", text: `Too many parallel tasks (${parallel.length}). Max is ${MAX_PARALLEL_TASKS}.` }],
					details: { mode: "parallel", results: [] },
				};
			}
			const cwd = ctx.cwd;
			const tasks: RunOptions[] = [];
			const unknown: string[] = [];
			for (const t of single ? [single] : parallel) {
				const config = agents.find((a) => a.name === t.agent);
				if (config) tasks.push({ ...t, agent: config, cwd: t.cwd ?? cwd });
				else unknown.push(t.agent);
			}
			if (unknown.length > 0) {
				return {
					content: [{ type: "text", text: `Unknown agent: ${unknown.join(", ")}. Available agents: ${available}.` }],
					details: { mode: "single", results: [] },
					isError: true,
				};
			}

			const mode = single ? "single" : "parallel";
			if (!ctx.hasUI) return runTasks(tasks, mode, signal, onUpdate);
			current = ctx;
			const group = parallel.map((t) => t.agent).join(", ");
			const id = `${single?.agent ?? "parallel"}-${++taskCount}`;
			const summary = single ? `${single.agent}: ${shortTask(single.brief)}` : group;
			const startedAt = Date.now();
			const key = `${id}@${startedAt}`;
			const controller = new AbortController();
			record({ event: "started", key, id, summary });
			const bg: BackgroundTask = {
				id,
				key,
				summary,
				startedAt,
				controller,
				group,
				sessions: new Set(),
				promise: runTasks(tasks, mode, controller.signal, (partial) => {
					bg.partial = partial;
					for (const r of partial.details?.results ?? []) {
						if (!r.sessionId || bg.sessions.has(r.sessionId)) continue;
						bg.sessions.add(r.sessionId);
						record({ event: "session", key, sessionId: r.sessionId });
					}
					updateStatus();
				}).catch(
					(error): AgentToolResult<SubagentDetails> => ({
						content: [{ type: "text", text: `Background task ${id} failed: ${error instanceof Error ? error.message : String(error)}` }],
						details: { mode: "single", results: [] },
						isError: true,
					}),
				),
			};
			backgroundTasks.set(id, bg);
			bg.promise.then((result) => finish(bg, result));
			updateStatus();

			return {
				content: [
					{
						type: "text",
						text: `Started background task ${id} (${summary}). Its result will arrive as a message when it finishes; end your turn when you have nothing else to do.`,
					},
				],
				details: { mode: "single", results: [] },
			};
		},

		renderCall(args, theme, _context) {
			if (args.tasks && args.tasks.length > 0) {
				let text =
					theme.fg("toolTitle", theme.bold("task ")) +
					theme.fg("accent", `parallel (${args.tasks.length} tasks)`);
				for (const t of args.tasks.slice(0, 3)) {
					const preview = t.brief.length > 40 ? `${t.brief.slice(0, 40)}...` : t.brief;
					text += `\n  ${theme.fg("accent", t.agent)}${theme.fg("dim", ` ${preview}`)}`;
				}
				if (args.tasks.length > 3) text += `\n  ${theme.fg("muted", `... +${args.tasks.length - 3} more`)}`;
				return new Text(text, 0, 0);
			}
			const agentName = args.agent || "...";
			const preview = args.brief ? (args.brief.length > 60 ? `${args.brief.slice(0, 60)}...` : args.brief) : "...";
			let text =
				theme.fg("toolTitle", theme.bold("task ")) +
				theme.fg("accent", agentName);
			text += `\n  ${theme.fg("dim", preview)}`;
			return new Text(text, 0, 0);
		},
	});
}
