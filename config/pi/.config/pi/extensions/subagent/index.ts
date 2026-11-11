/**
 * Subagent Tool - Delegate tasks to specialized agents
 *
 * Spawns a separate `pi` process for each subagent invocation,
 * giving it an isolated context window.
 *
 * Supports two modes:
 *   - Single: { agent: "name", task: "..." }
 *   - Parallel: { tasks: [{ agent: "name", task: "..." }, ...] }
 *
 * Uses JSON mode to capture structured output from subagents.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentToolResult, ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { Message } from "@earendil-works/pi-ai";
import { StringEnum } from "@earendil-works/pi-ai";
import {
	type ExtensionAPI,
	type ExtensionToolContext,
	formatReadLineRange,
	getMarkdownTheme,
	withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@earendil-works/pi-tui";
import { type Static, Type } from "typebox";
import { type AgentConfig, discoverAgents, parseThinkingLevel, THINKING_LEVELS } from "./agents.ts";
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
	themeFg: (color: any, text: string) => string,
): string {
	const shortenPath = (p: string) => {
		const home = os.homedir();
		return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
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
	agentSource: "user" | "unknown";
	task: string;
	exitCode: number;
	messages: Message[];
	stderr: string;
	usage: UsageStats;
	model?: string;
	sessionId?: string;
	fallbackFrom?: string[];
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

function modelLabel(r: SingleResult): string | undefined {
	const model = r.fallbackFrom?.length ? `${r.model} (fallback #${r.fallbackFrom.length})` : r.model;
	return r.sessionId ? `${model ?? "?"} session:${r.sessionId}` : model;
}

function truncateParallelOutput(output: string): string {
	const byteLength = Buffer.byteLength(output, "utf8");
	if (byteLength <= PER_TASK_OUTPUT_CAP) return output;

	let truncated = output.slice(0, PER_TASK_OUTPUT_CAP);
	while (Buffer.byteLength(truncated, "utf8") > PER_TASK_OUTPUT_CAP) {
		truncated = truncated.slice(0, -1);
	}
	return `${truncated}\n\n[Output truncated: ${byteLength - Buffer.byteLength(truncated, "utf8")} bytes omitted. Full output preserved in tool details.]`;
}

type DisplayItem = { type: "text"; text: string } | { type: "toolCall"; name: string; args: Record<string, any> };

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
	const workers = new Array(limit).fill(null).map(async () => {
		while (true) {
			const current = nextIndex++;
			if (current >= items.length) return;
			results[current] = await fn(items[current], current);
		}
	});
	await Promise.all(workers);
	return results;
}

async function writePromptToTempFile(agentName: string, prompt: string): Promise<{ dir: string; filePath: string }> {
	const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-subagent-"));
	const safeName = agentName.replace(/[^\w.-]+/g, "_");
	const filePath = path.join(tmpDir, `prompt-${safeName}.md`);
	await withFileMutationQueue(filePath, async () => {
		await fs.promises.writeFile(filePath, prompt, { encoding: "utf-8", mode: 0o600 });
	});
	return { dir: tmpDir, filePath };
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

interface DispatchDefaults {
	model?: string;
	thinkingLevel?: ThinkingLevel;
}

interface RunOptions {
	agentName: string;
	task: string;
	cwd?: string;
	thinking?: ThinkingLevel;
	model?: string;
	signal?: AbortSignal;
	onUpdate?: OnUpdateCallback;
	makeDetails: (results: SingleResult[]) => SubagentDetails;
}

function emptyUsage(): UsageStats {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 };
}

function identitySuffix(agentName: string): string {
	return [
		"",
		"---",
		`You are running as the "${agentName}" subagent of another pi session. That session delegated this task to you and will read only your final message, so put everything it needs there.`,
		"You cannot delegate further: there is no subagent tool here. Do the task yourself.",
	].join("\n");
}

function runPi(
	args: string[],
	cwd: string,
	env: Record<string, string>,
	signal: AbortSignal | undefined,
	result: SingleResult,
	emit: () => void,
): Promise<{ exitCode: number; aborted: boolean }> {
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
		let failedModel: string | undefined;

		const processLine = (line: string) => {
			if (!line.trim()) return;
			let event: any;
			try {
				event = JSON.parse(line);
			} catch {
				return;
			}
			if (event.type === "session" && typeof event.id === "string") result.sessionId = event.id;
			if (event.type === "message_end" && event.message) {
				const msg = event.message as Message;
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
			if (event.type === "tool_result_end" && event.message) {
				result.messages.push(event.message as Message);
				emit();
			}
		};

		proc.stdout.on("data", (data) => {
			buffer += data.toString();
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";
			for (const line of lines) processLine(line);
		});
		proc.stderr.on("data", (data) => {
			result.stderr += data.toString();
		});
		proc.on("close", (code) => {
			if (buffer.trim()) processLine(buffer);
			resolve({ exitCode: code ?? 0, aborted });
		});
		proc.on("error", () => resolve({ exitCode: 1, aborted }));

		if (signal) {
			const killProc = () => {
				aborted = true;
				proc.kill("SIGTERM");
				setTimeout(() => {
					if (!proc.killed) proc.kill("SIGKILL");
				}, 5000);
			};
			if (signal.aborted) killProc();
			else signal.addEventListener("abort", killProc, { once: true });
		}
	});
}

async function runSingleAgent(
	defaultCwd: string,
	dispatchDefaults: DispatchDefaults,
	agents: AgentConfig[],
	opts: RunOptions,
): Promise<SingleResult> {
	const { agentName, task, signal, onUpdate, makeDetails } = opts;
	const agent = agents.find((a) => a.name === agentName);

	if (!agent) {
		const available = agents.map((a) => `"${a.name}"`).join(", ") || "none";
		return {
			agent: agentName,
			agentSource: "unknown",
			task,
			exitCode: 1,
			messages: [],
			stderr: `Unknown agent: "${agentName}". Available agents: ${available}.`,
			usage: emptyUsage(),
		};
	}

	const inheritsDispatchConfig = !agent.model && !opts.model;
	const firstModel = opts.model ?? agent.model ?? dispatchDefaults.model;
	const model = opts.model ?? fallbackModel(agent) ?? firstModel;
	const thinkingLevel =
		opts.thinking ?? agent.thinking ?? (inheritsDispatchConfig ? dispatchDefaults.thinkingLevel : undefined);

	const result: SingleResult = {
		agent: agentName,
		agentSource: agent.source,
		task,
		exitCode: 0,
		messages: [],
		stderr: "",
		usage: emptyUsage(),
		model: firstModel,
	};

	const emit = () => {
		if (onUpdate) {
			onUpdate({
				content: [{ type: "text", text: getFinalOutput(result.messages) || "(running...)" }],
				details: makeDetails([result]),
			});
		}
	};

	let tmp: { dir: string; filePath: string } | null = null;
	try {
		tmp = await writePromptToTempFile(agent.name, `${agent.systemPrompt.trim()}${identitySuffix(agent.name)}`);
		const args = ["--mode", "json", "-p"];
		if (model) args.push("--model", model);
		if (thinkingLevel) args.push("--thinking", thinkingLevel);
		if (agent.tools && agent.tools.length > 0) args.push("--tools", agent.tools.join(","));
		args.push("--append-system-prompt", tmp.filePath, `Task: ${task}`);

		const env: Record<string, string> = { PI_SUBAGENT: agent.name };
		if (thinkingLevel) env.PI_SUBAGENT_THINKING = thinkingLevel;

		const { exitCode, aborted } = await runPi(args, opts.cwd ?? defaultCwd, env, signal, result, emit);
		result.exitCode = exitCode;
		if (aborted) throw new Error("Subagent was aborted");
		return result;
	} finally {
		if (tmp) {
			try {
				fs.unlinkSync(tmp.filePath);
			} catch {
				/* ignore */
			}
			try {
				fs.rmdirSync(tmp.dir);
			} catch {
				/* ignore */
			}
		}
	}
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
	task: Type.String({ description: "Task to delegate to the agent" }),
	cwd: Type.Optional(Type.String({ description: "Working directory for the agent process" })),
	thinking: Type.Optional(ThinkingSchema),
	model: Type.Optional(ModelSchema),
});

const SubagentParams = Type.Object({
	agent: Type.Optional(Type.String({ description: "Name of the agent to invoke (for single mode)" })),
	task: Type.Optional(Type.String({ description: "Task to delegate (for single mode)" })),
	tasks: Type.Optional(Type.Array(TaskItem, { description: "Array of {agent, task} for parallel execution" })),
	cwd: Type.Optional(Type.String({ description: "Working directory for the agent process (single mode)" })),
	thinking: Type.Optional(ThinkingSchema),
	model: Type.Optional(ModelSchema),
	background: Type.Optional(
		Type.Boolean({
			description:
				"Return immediately with a background task id instead of waiting; the result arrives later as a message that wakes you. Use for long tasks when you have other work or something to tell the user meanwhile. Ignored without a UI. Default: false.",
		}),
	),
});

type SubagentParamsType = Static<typeof SubagentParams>;

interface BackgroundTask {
	id: string;
	summary: string;
	startedAt: number;
	controller: AbortController;
	partial?: AgentToolResult<SubagentDetails>;
	result?: AgentToolResult<SubagentDetails>;
	promise: Promise<AgentToolResult<SubagentDetails>>;
}

function resultText(result: AgentToolResult<SubagentDetails>): string {
	return result.content
		.map((c) => (c.type === "text" ? c.text : "(image)"))
		.join("\n")
		.trim();
}

function modelsLine(result: AgentToolResult<SubagentDetails>): string {
	const models = (result.details?.results ?? [])
		.map((r) => `${r.agent}: ${r.model ?? "?"}${r.fallbackFrom?.length ? ` (fallback #${r.fallbackFrom.length})` : ""}`)
		.join(", ");
	return models ? ` [${models}]` : "";
}

function shortTask(task: string | undefined, max = 50): string {
	const t = (task ?? "").replace(/\s+/g, " ").trim();
	return t.length > max ? `${t.slice(0, max)}...` : t;
}

export default function (pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT) {
		registerFallback(pi, process.env.PI_SUBAGENT);
		return;
	}

	const backgroundTasks = new Map<string, BackgroundTask>();

	const agentCatalog = () => {
		const agents = discoverAgents();
		if (agents.length === 0) return "(no agents defined)";
		return agents.map((a) => `- ${a.name}: ${a.description}`).join("\n");
	};

	const updateWidget = (ctx: ExtensionToolContext) => {
		if (!ctx.hasUI) return;
		const running = [...backgroundTasks.values()].filter((bg) => !bg.result);
		if (running.length === 0) {
			ctx.ui.setWidget("subagent", undefined);
			return;
		}
		ctx.ui.setWidget(
			"subagent",
			running.map((bg) => {
				const results = bg.partial?.details?.results ?? [];
				const turns = results.reduce((n, r) => n + r.usage.turns, 0);
				const elapsed = Math.round((Date.now() - bg.startedAt) / 1000);
				return `⏳ ${bg.id}  ${bg.summary}  ${turns} turns  ${elapsed}s`;
			}),
		);
	};

	async function runCall(
		params: SubagentParamsType,
		ctx: ExtensionToolContext,
		signal: AbortSignal | undefined,
		onUpdate: OnUpdateCallback | undefined,
	): Promise<AgentToolResult<SubagentDetails>> {
		const dispatchDefaults: DispatchDefaults = {
			model: ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined,
			thinkingLevel: ctx.thinkingLevel,
		};
		const agents = discoverAgents();
		const hasTasks = (params.tasks?.length ?? 0) > 0;
		const hasSingle = Boolean(params.agent && params.task);
		const modeCount = Number(hasTasks) + Number(hasSingle);

		const makeDetails =
			(mode: "single" | "parallel") =>
			(results: SingleResult[]): SubagentDetails => ({
				mode,
				results,
			});

		if (modeCount !== 1) {
			const available = agents.map((a) => `${a.name} (${a.source})`).join(", ") || "none";
			return {
				content: [{ type: "text", text: `Invalid parameters. Provide exactly one mode: agent + task, or tasks.\nAvailable agents: ${available}` }],
				details: makeDetails("single")([]),
			};
		}

		if (params.tasks && params.tasks.length > 0) {
			if (params.tasks.length > MAX_PARALLEL_TASKS)
				return {
					content: [{ type: "text", text: `Too many parallel tasks (${params.tasks.length}). Max is ${MAX_PARALLEL_TASKS}.` }],
					details: makeDetails("parallel")([]),
				};

			const allResults: SingleResult[] = params.tasks.map((t) => ({
				agent: t.agent,
				agentSource: "unknown",
				task: t.task,
				exitCode: -1,
				messages: [],
				stderr: "",
				usage: emptyUsage(),
			}));

			const emitParallelUpdate = () => {
				if (onUpdate) {
					const running = allResults.filter((r) => r.exitCode === -1).length;
					const done = allResults.length - running;
					onUpdate({
						content: [{ type: "text", text: `Parallel: ${done}/${allResults.length} done, ${running} running...` }],
						details: makeDetails("parallel")([...allResults]),
					});
				}
			};

			const results = await mapWithConcurrencyLimit(params.tasks, MAX_CONCURRENCY, async (t, index) => {
				const result = await runSingleAgent(ctx.cwd, dispatchDefaults, agents, {
					agentName: t.agent,
					task: t.task,
					cwd: t.cwd,
					thinking: parseThinkingLevel(t.thinking),
					model: t.model,
					signal,
					onUpdate: (partial) => {
						if (partial.details?.results[0]) {
							allResults[index] = partial.details.results[0];
							emitParallelUpdate();
						}
					},
					makeDetails: makeDetails("parallel"),
				});
				allResults[index] = result;
				emitParallelUpdate();
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
				details: makeDetails("parallel")(results),
			};
		}

		if (params.agent && params.task) {
			const result = await runSingleAgent(ctx.cwd, dispatchDefaults, agents, {
				agentName: params.agent,
				task: params.task,
				cwd: params.cwd,
				thinking: parseThinkingLevel(params.thinking),
				model: params.model,
				signal,
				onUpdate,
				makeDetails: makeDetails("single"),
			});
			if (isFailedResult(result)) {
				return {
					content: [{ type: "text", text: `Agent ${result.stopReason || "failed"}${modelNote(result)}: ${getResultOutput(result)}${sessionLine(result)}` }],
					details: makeDetails("single")([result]),
					isError: true,
				};
			}
			return {
				content: [{ type: "text", text: `${getFinalOutput(result.messages) || "(no output)"}${modelNote(result) ? `\n\n_${modelNote(result).trim()}_` : ""}${sessionLine(result)}` }],
				details: makeDetails("single")([result]),
			};
		}

		const available = agents.map((a) => `${a.name} (${a.source})`).join(", ") || "none";
		return {
			content: [{ type: "text", text: `Invalid parameters. Available agents: ${available}` }],
			details: makeDetails("single")([]),
		};
	}

	pi.on("session_shutdown", async () => {
		for (const bgTask of backgroundTasks.values()) if (!bgTask.result) bgTask.controller.abort();
	});

	pi.registerCommand("task", {
		description: "List background tasks, or `kill <id|all>`",
		handler: async (args, ctx) => {
			const [verb, target] = (args ?? "").trim().split(/\s+/);
			if (verb === "kill") {
				const victims = [...backgroundTasks.values()].filter((bg) => !bg.result && (target === "all" || bg.id === target));
				for (const bg of victims) bg.controller.abort();
				ctx.ui.notify(victims.length ? `Killed ${victims.map((bg) => bg.id).join(", ")}` : "Nothing to kill", "info");
				return;
			}
			if (backgroundTasks.size === 0) {
				ctx.ui.notify("No background tasks", "info");
				return;
			}
			const lines = [...backgroundTasks.values()].map(
				(bg) => `${bg.result ? (bg.result.isError ? "✗" : "✓") : "⏳"} ${bg.id}  ${bg.summary}`,
			);
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	pi.registerTool({
		name: "subagent",
		label: "Subagent",
		description: [
			"Delegate a task to a subagent: a separate pi process with its own context window, model and tools.",
			"The subagent sees nothing of this conversation. Its brief must be self-contained: goal, exact files or symbols, constraints, what done looks like, and the report format you want back. Only its final message comes back to you. Each result ends with the subagent's session id; its full transcript is kept and opens with `pi --session <id>`.",
			"Agents are bundles of defaults (model, tools, report format), not roles: give the role in the brief. A merger is a worker told to merge; a critic is a reviewer told what to criticise.",
			"Modes: single (agent + task), parallel (tasks, independent and touching disjoint files).",
			"Each task takes an optional thinking level and model override. background=true returns a background task id immediately and the result arrives later as a message that wakes you; use it when you have something to say or do meanwhile, otherwise run in the foreground.",
			"Available agents:",
			agentCatalog(),
		].join("\n"),
		parameters: SubagentParams,

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			if (!params.background || !ctx.hasUI) return runCall(params, ctx, signal, onUpdate);

			const kind = params.agent ?? "parallel";
			const id = `${kind}-${Date.now().toString(36).slice(-5)}`;
			const summary = params.agent
				? `${params.agent}: ${shortTask(params.task)}`
				: (params.tasks ?? []).map((t) => t.agent).join(", ");
			const controller = new AbortController();
			const bgTask: BackgroundTask = {
				id,
				summary,
				startedAt: Date.now(),
				controller,
				promise: Promise.resolve(undefined as unknown as AgentToolResult<SubagentDetails>),
			};
			bgTask.promise = runCall(params, ctx, controller.signal, (partial) => {
				bgTask.partial = partial;
				updateWidget(ctx);
			}).catch(
				(error): AgentToolResult<SubagentDetails> => ({
					content: [{ type: "text", text: `Background task ${id} failed: ${error instanceof Error ? error.message : String(error)}` }],
					details: { mode: "single", results: [] },
					isError: true,
				}),
			);
			bgTask.promise.then((result) => {
				bgTask.result = result;
				updateWidget(ctx);
				pi.sendMessage(
					{
						customType: "subagent-result",
						content: `Background task ${id} (${summary}) ${result.isError ? "failed" : "finished"}${modelsLine(result)}:\n\n${resultText(result)}`,
						display: true,
						details: result.details,
					},
					{ deliverAs: "followUp", triggerTurn: true },
				);
			});
			backgroundTasks.set(id, bgTask);
			updateWidget(ctx);

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
					theme.fg("toolTitle", theme.bold("subagent ")) +
					theme.fg("accent", `parallel (${args.tasks.length} tasks)`) +
					theme.fg("muted", " [user]");
				for (const t of args.tasks.slice(0, 3)) {
					const preview = t.task.length > 40 ? `${t.task.slice(0, 40)}...` : t.task;
					text += `\n  ${theme.fg("accent", t.agent)}${theme.fg("dim", ` ${preview}`)}`;
				}
				if (args.tasks.length > 3) text += `\n  ${theme.fg("muted", `... +${args.tasks.length - 3} more`)}`;
				return new Text(text, 0, 0);
			}
			const agentName = args.agent || "...";
			const preview = args.task ? (args.task.length > 60 ? `${args.task.slice(0, 60)}...` : args.task) : "...";
			let text =
				theme.fg("toolTitle", theme.bold("subagent ")) +
				theme.fg("accent", agentName) +
				theme.fg("muted", " [user]");
			text += `\n  ${theme.fg("dim", preview)}`;
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme, _context) {
			const details = result.details as SubagentDetails | undefined;
			if (!details || details.results.length === 0) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
			}

			const mdTheme = getMarkdownTheme();

			const renderDisplayItems = (items: DisplayItem[], limit?: number) => {
				const toShow = limit ? items.slice(-limit) : items;
				const skipped = limit && items.length > limit ? items.length - limit : 0;
				let text = "";
				if (skipped > 0) text += theme.fg("muted", `... ${skipped} earlier items\n`);
				for (const item of toShow) {
					if (item.type === "text") {
						const preview = expanded ? item.text : item.text.split("\n").slice(0, 3).join("\n");
						text += `${theme.fg("toolOutput", preview)}\n`;
					} else {
						text += `${theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme))}\n`;
					}
				}
				return text.trimEnd();
			};

			if (details.mode === "single" && details.results.length === 1) {
				const r = details.results[0];
				const isError = isFailedResult(r);
				const icon = isError ? theme.fg("error", "✗") : theme.fg("success", "✓");
				const displayItems = getDisplayItems(r.messages);
				const finalOutput = getFinalOutput(r.messages);

				if (expanded) {
					const container = new Container();
					let header = `${icon} ${theme.fg("toolTitle", theme.bold(r.agent))}${theme.fg("muted", ` (${r.agentSource})`)}`;
					if (isError && r.stopReason) header += ` ${theme.fg("error", `[${r.stopReason}]`)}`;
					container.addChild(new Text(header, 0, 0));
					if (isError && r.errorMessage)
						container.addChild(new Text(theme.fg("error", `Error: ${r.errorMessage}`), 0, 0));
					container.addChild(new Spacer(1));
					container.addChild(new Text(theme.fg("muted", "─── Task ───"), 0, 0));
					container.addChild(new Text(theme.fg("dim", r.task), 0, 0));
					container.addChild(new Spacer(1));
					container.addChild(new Text(theme.fg("muted", "─── Output ───"), 0, 0));
					if (displayItems.length === 0 && !finalOutput) {
						container.addChild(new Text(theme.fg("muted", "(no output)"), 0, 0));
					} else {
						for (const item of displayItems) {
							if (item.type === "toolCall")
								container.addChild(
									new Text(
										theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme)),
										0,
										0,
									),
								);
						}
						if (finalOutput) {
							container.addChild(new Spacer(1));
							container.addChild(new Markdown(finalOutput.trim(), 0, 0, mdTheme));
						}
					}
					const usageStr = formatUsageStats(r.usage, modelLabel(r));
					if (usageStr) {
						container.addChild(new Spacer(1));
						container.addChild(new Text(theme.fg("dim", usageStr), 0, 0));
					}
					return container;
				}

				let text = `${icon} ${theme.fg("toolTitle", theme.bold(r.agent))}${theme.fg("muted", ` (${r.agentSource})`)}`;
				if (isError && r.stopReason) text += ` ${theme.fg("error", `[${r.stopReason}]`)}`;
				if (isError && r.errorMessage) text += `\n${theme.fg("error", `Error: ${r.errorMessage}`)}`;
				else if (displayItems.length === 0) text += `\n${theme.fg("muted", "(no output)")}`;
				else {
					text += `\n${renderDisplayItems(displayItems, COLLAPSED_ITEM_COUNT)}`;
					if (displayItems.length > COLLAPSED_ITEM_COUNT) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
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
				const running = details.results.filter((r) => r.exitCode === -1).length;
				const successCount = details.results.filter((r) => r.exitCode !== -1 && !isFailedResult(r)).length;
				const failCount = details.results.filter((r) => r.exitCode !== -1 && isFailedResult(r)).length;
				const isRunning = running > 0;
				const icon = isRunning
					? theme.fg("warning", "⏳")
					: failCount > 0
						? theme.fg("warning", "◐")
						: theme.fg("success", "✓");
				const status = isRunning
					? `${successCount + failCount}/${details.results.length} done, ${running} running`
					: `${successCount}/${details.results.length} tasks`;

				if (expanded && !isRunning) {
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
						const displayItems = getDisplayItems(r.messages);
						const finalOutput = getFinalOutput(r.messages);

						container.addChild(new Spacer(1));
						container.addChild(
							new Text(`${theme.fg("muted", "─── ") + theme.fg("accent", r.agent)} ${rIcon}`, 0, 0),
						);
						container.addChild(new Text(theme.fg("muted", "Task: ") + theme.fg("dim", r.task), 0, 0));

						// Show tool calls
						for (const item of displayItems) {
							if (item.type === "toolCall") {
								container.addChild(
									new Text(
										theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme)),
										0,
										0,
									),
								);
							}
						}

						// Show final output as markdown
						if (finalOutput) {
							container.addChild(new Spacer(1));
							container.addChild(new Markdown(finalOutput.trim(), 0, 0, mdTheme));
						}

						const taskUsage = formatUsageStats(r.usage, modelLabel(r));
						if (taskUsage) container.addChild(new Text(theme.fg("dim", taskUsage), 0, 0));
					}

					const usageStr = formatUsageStats(aggregateUsage(details.results));
					if (usageStr) {
						container.addChild(new Spacer(1));
						container.addChild(new Text(theme.fg("dim", `Total: ${usageStr}`), 0, 0));
					}
					return container;
				}

				// Collapsed view (or still running)
				let text = `${icon} ${theme.fg("toolTitle", theme.bold("parallel "))}${theme.fg("accent", status)}`;
				for (const r of details.results) {
					const rIcon =
						r.exitCode === -1
							? theme.fg("warning", "⏳")
							: isFailedResult(r)
								? theme.fg("error", "✗")
								: theme.fg("success", "✓");
					const displayItems = getDisplayItems(r.messages);
					text += `\n\n${theme.fg("muted", "─── ")}${theme.fg("accent", r.agent)} ${rIcon}`;
					if (displayItems.length === 0)
						text += `\n${theme.fg("muted", r.exitCode === -1 ? "(running...)" : "(no output)")}`;
					else text += `\n${renderDisplayItems(displayItems, 5)}`;
				}
				if (!isRunning) {
					const usageStr = formatUsageStats(aggregateUsage(details.results));
					if (usageStr) text += `\n\n${theme.fg("dim", `Total: ${usageStr}`)}`;
				}
				if (!expanded) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
				return new Text(text, 0, 0);
			}

			const text = result.content[0];
			return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
		},
	});
}
