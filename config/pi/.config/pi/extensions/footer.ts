import { homedir } from "node:os";
import { sep } from "node:path";
import type { ExtensionAPI, ExtensionContext, ThemeColor } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const CAP_LEFT = "\ue0b6";
const CAP_RIGHT = "\ue0b4";
const FOLDER = "\uf07b";
const BRANCH = "\ue725";

const LEVEL_COLOR: Record<string, ThemeColor> = {
	off: "thinkingOff",
	minimal: "thinkingMinimal",
	low: "thinkingLow",
	medium: "thinkingMedium",
	high: "thinkingHigh",
	xhigh: "thinkingXhigh",
	max: "thinkingMax",
};

interface Totals {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	hitRate: number | undefined;
}

interface Data {
	path: string;
	branch: string;
	name: string;
	usage: Totals;
	subscription: boolean;
	percent: number | null;
	window: number;
	provider: string;
	model: string;
	level: string | undefined;
}

interface View {
	tokens: boolean;
	shortPath: boolean;
	name: boolean;
	provider: boolean;
	cost: boolean;
	branchMax: number | undefined;
	git: boolean;
	context: boolean;
	pathMax: number | undefined;
	model: boolean;
}

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

function clean(text: string): string {
	return text
		.replace(/\p{Cc}/gu, " ")
		.replace(/ +/g, " ")
		.trim();
}

function statusLines(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.replace(/[\r\t]/g, " ").trimEnd())
		.filter((line) => line.trim() !== "");
}

function tildePath(cwd: string): string {
	const home = homedir();
	if (cwd === home) return "~";
	if (cwd.startsWith(home + sep)) return `~${cwd.slice(home.length)}`;
	return cwd;
}

function abbreviate(path: string): string {
	const parts = path.split(sep);
	return parts
		.map((part, index) => {
			if (index === parts.length - 1 || part === "" || part === "~") return part;
			return part.startsWith(".") ? part.slice(0, 2) : part.slice(0, 1);
		})
		.join(sep);
}

function cutLeft(text: string, max: number): string {
	if (visibleWidth(text) <= max) return text;
	const chars = [...text];
	let tail = "";
	for (let index = chars.length - 1; index >= 0; index--) {
		const next = chars[index] + tail;
		if (visibleWidth(next) > max - 1) break;
		tail = next;
	}
	return `…${tail}`;
}

function sumUsage(ctx: ExtensionContext): Totals {
	const totals: Totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, hitRate: undefined };
	const add = (usage: { input: number; output: number; cacheRead: number; cacheWrite: number; cost: { total: number } }) => {
		totals.input += usage.input;
		totals.output += usage.output;
		totals.cacheRead += usage.cacheRead;
		totals.cacheWrite += usage.cacheWrite;
		totals.cost += usage.cost.total;
	};
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "usage") {
			add(entry.usage);
		} else if (entry.type === "message" && entry.message.role === "assistant") {
			const usage = entry.message.usage;
			add(usage);
			const prompt = usage.input + usage.cacheRead + usage.cacheWrite;
			totals.hitRate = prompt > 0 ? (usage.cacheRead / prompt) * 100 : undefined;
		} else if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.usage) {
			add(entry.message.usage);
		} else if ((entry.type === "branch_summary" || entry.type === "compaction") && entry.usage) {
			add(entry.usage);
		}
	}
	return totals;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;

		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsubscribe = footerData.onBranchChange(() => tui.requestRender());
			let cached: { key: string; usage: Totals; percent: number | null; window: number } | undefined;

			const gather = (): Data => {
				const model = ctx.model;
				const key = `${ctx.sessionManager.getLeafId()}\n${model?.provider}\n${model?.id}`;
				if (!cached || cached.key !== key) {
					const context = ctx.getContextUsage();
					cached = {
						key,
						usage: sumUsage(ctx),
						percent: context?.percent ?? null,
						window: context?.contextWindow ?? model?.contextWindow ?? 0,
					};
				}
				return {
					path: clean(tildePath(ctx.sessionManager.getCwd())),
					branch: clean(footerData.getGitBranch() ?? ""),
					name: clean(ctx.sessionManager.getSessionName() ?? ""),
					usage: cached.usage,
					subscription: model ? ctx.modelRegistry.isUsingOAuth(model) : false,
					percent: cached.percent,
					window: cached.window,
					provider: model && footerData.getAvailableProviderCount() > 1 ? model.provider : "",
					model: model?.id ?? "no-model",
					level: model?.reasoning ? pi.getThinkingLevel() : undefined,
				};
			};

			const pill = (inner: string): string => {
				const surface = theme.colors.toolPendingBg;
				const reset = theme.getBgAnsi("toolPendingBg");
				const body = ` ${inner} `.replace(/\x1b\[(?:0|49)?m/g, (match) => match + reset);
				return (
					theme.style(CAP_LEFT, { fg: surface }) +
					theme.bg("toolPendingBg", body) +
					theme.style(CAP_RIGHT, { fg: surface })
				);
			};

			const directory = (path: string): string => {
				const cut = path.lastIndexOf(sep) + 1;
				return theme.fg("mdLink", `${FOLDER} ${path.slice(0, cut)}${theme.bold(path.slice(cut))}`);
			};

			const build = (view: View, data: Data, width: number): { line: string; over: number } => {
				const left: string[] = [];
				const right: string[] = [];

				let path = view.shortPath ? abbreviate(data.path) : data.path;
				if (view.pathMax !== undefined) path = cutLeft(path, view.pathMax);
				left.push(directory(path));

				if (data.branch && view.git) {
					const branch = view.branchMax === undefined ? data.branch : truncateToWidth(data.branch, view.branchMax, "…");
					left.push(pill(`${theme.fg("muted", "on")} ${theme.fg("syntaxOperator", `${BRANCH} ${branch}`)}`));
				}

				if (data.name && view.name) left.push(pill(theme.fg("text", data.name)));

				const usage = data.usage;
				if (view.tokens) {
					const parts: string[] = [];
					if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
					if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
					if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
					if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
					if ((usage.cacheRead > 0 || usage.cacheWrite > 0) && usage.hitRate !== undefined) {
						parts.push(`CH${usage.hitRate.toFixed(1)}%`);
					}
					if (parts.length > 0) right.push(pill(theme.fg("muted", parts.join(" "))));
				}

				if (view.cost && (usage.cost || data.subscription)) {
					const cost = theme.fg("text", `$${usage.cost.toFixed(3)}`);
					right.push(pill(data.subscription ? `${cost} ${theme.fg("muted", "sub")}` : cost));
				}

				if (view.context) {
					const percent = data.percent;
					const text = `${percent === null ? "?" : `${percent.toFixed(1)}%`}/${formatTokens(data.window)}`;
					const color: ThemeColor =
						percent !== null && percent > 90 ? "error" : percent !== null && percent > 70 ? "warning" : "text";
					right.push(pill(theme.fg(color, text)));
				}

				const model: string[] = [];
				if (view.model) {
					const provider =
						data.provider && view.provider ? theme.fg("muted", data.provider) + theme.fg("dim", "/") : "";
					model.push(provider + theme.fg("text", data.model));
				}
				if (data.level === "off") model.push(theme.fg("muted", "thinking off"));
				else if (data.level) model.push(theme.fg(LEVEL_COLOR[data.level] ?? "thinkingOff", data.level));
				if (model.length > 0) right.push(pill(model.join(" ")));

				const leftText = left.join(" ");
				const rightText = right.join(" ");
				const leftWidth = visibleWidth(leftText);
				const rightWidth = visibleWidth(rightText);
				const gap = rightText ? 2 : 0;
				return {
					line: leftText + " ".repeat(Math.max(gap, width - leftWidth - rightWidth)) + rightText,
					over: leftWidth + gap + rightWidth - width,
				};
			};

			return {
				dispose: unsubscribe,
				invalidate() {},
				render(total: number): string[] {
					const margin = total > 1 ? " " : "";
					const width = total - margin.length;
					const data = gather();
					const view: View = {
						tokens: true,
						shortPath: false,
						name: true,
						provider: true,
						cost: true,
						branchMax: undefined,
						git: true,
						context: true,
						pathMax: undefined,
						model: true,
					};
					const branchWidth = visibleWidth(data.branch);
					const pathWidth = visibleWidth(abbreviate(data.path));
					const stages: Array<(over: number) => void> = [
						() => {},
						() => (view.tokens = false),
						() => (view.shortPath = true),
						() => (view.name = false),
						() => (view.provider = false),
						() => (view.cost = false),
						(over) => (view.branchMax = Math.max(8, branchWidth - over)),
						() => (view.git = false),
						() => (view.context = false),
						(over) => (view.pathMax = Math.max(8, pathWidth - over)),
						() => (view.model = false),
					];

					let built = { line: "", over: 0 };
					for (const stage of stages) {
						stage(built.over);
						built = build(view, data, width);
						if (built.over <= 0) break;
					}
					if (built.over <= 0 && view.shortPath) {
						const full = build({ ...view, shortPath: false, pathMax: undefined }, data, width);
						if (full.over <= 0) built = full;
					}
					const statuses = [...footerData.getExtensionStatuses().entries()]
						.sort(([a], [b]) => a.localeCompare(b))
						.flatMap(([, text]) => statusLines(text))
						.map((line) => margin + truncateToWidth(theme.fg("muted", line), width, "…"));
					return [margin + truncateToWidth(built.line, width, "…"), ...(statuses.length > 0 ? statuses : [""])];
				},
			};
		});
	});
}
