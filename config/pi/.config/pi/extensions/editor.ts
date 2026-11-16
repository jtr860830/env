import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import { CustomEditor, type ExtensionAPI, type ExtensionContext, type ThemeColor } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";

const GLYPH = "\u276f";
const CAP_LEFT = "\ue0b6";
const CAP_RIGHT = "\ue0b4";
const TOP_LEFT = "\u256d";
const TOP_RIGHT = "\u256e";
const BOTTOM_LEFT = "\u2570";
const BOTTOM_RIGHT = "\u256f";

interface Totals {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	hitRate: number | undefined;
}

interface Data {
	usage: Totals;
	subscription: boolean;
	percent: number | null;
	window: number;
	provider: string;
	model: string;
	level: ThinkingLevel | undefined;
}

interface View {
	tokens: boolean;
	provider: boolean;
	cost: boolean;
	context: boolean;
	model: boolean;
}

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
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

class PromptEditor extends CustomEditor {
	private pi!: ExtensionAPI;
	private ctx!: ExtensionContext;
	private hiddenAbove = 0;
	private cached: { key: string; usage: Totals; percent: number | null; window: number } | undefined;

	attach(pi: ExtensionAPI, ctx: ExtensionContext): this {
		this.pi = pi;
		this.ctx = ctx;
		return this;
	}

	private gather(): Data {
		const ctx = this.ctx;
		const model = ctx.model;
		const key = `${ctx.sessionManager.getLeafId()}\n${model?.provider}\n${model?.id}`;
		if (!this.cached || this.cached.key !== key) {
			const context = ctx.getContextUsage();
			this.cached = {
				key,
				usage: sumUsage(ctx),
				percent: context?.percent ?? null,
				window: context?.contextWindow ?? model?.contextWindow ?? 0,
			};
		}
		return {
			usage: this.cached.usage,
			subscription: model ? ctx.modelRegistry.isUsingOAuth(model) : false,
			percent: this.cached.percent,
			window: this.cached.window,
			provider: model?.provider ?? "",
			model: model?.id ?? "no-model",
			level: model?.reasoning ? this.pi.getThinkingLevel() : undefined,
		};
	}

	private pills(view: View, data: Data): string {
		const theme = this.ctx.ui.theme;
		const surface = theme.colors.toolPendingBg;
		const reset = theme.getBgAnsi("toolPendingBg");
		const pill = (inner: string): string =>
			theme.style(CAP_LEFT, { fg: surface }) +
			theme.bg("toolPendingBg", ` ${inner} `.replace(/\x1b\[(?:0|49)?m/g, (match) => match + reset)) +
			theme.style(CAP_RIGHT, { fg: surface });
		const out: string[] = [];
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
			if (parts.length > 0) out.push(pill(theme.fg("muted", parts.join(" "))));
		}

		if (view.cost && (usage.cost || data.subscription)) {
			const cost = theme.fg("text", `$${usage.cost.toFixed(3)}`);
			out.push(pill(data.subscription ? `${cost} ${theme.fg("muted", "sub")}` : cost));
		}

		if (view.context) {
			const percent = data.percent;
			const text = `${percent === null ? "?" : `${percent.toFixed(1)}%`}/${formatTokens(data.window)}`;
			const color: ThemeColor =
				percent !== null && percent > 90 ? "error" : percent !== null && percent > 70 ? "warning" : "text";
			out.push(pill(theme.fg(color, text)));
		}

		if (view.model) {
			const provider = data.provider && view.provider ? theme.fg("muted", data.provider) + theme.fg("dim", "/") : "";
			const model = [provider + theme.fg("text", data.model)];
			if (data.level === "off") model.push(theme.fg("muted", "thinking off"));
			else if (data.level) model.push(theme.getThinkingBorderColor(data.level)(data.level));
			out.push(pill(model.join(" ")));
		}

		return out.join(" ");
	}

	protected override renderTopBorder(width: number, hiddenLineCount: number): string {
		this.hiddenAbove = hiddenLineCount;
		if (width < 4) return super.renderTopBorder(width, hiddenLineCount);
		return this.borderColor(TOP_LEFT) + super.renderTopBorder(width - 2, hiddenLineCount) + this.borderColor(TOP_RIGHT);
	}

	protected override renderBottomBorder(width: number, hiddenLineCount: number): string {
		if (width < 4) return super.renderBottomBorder(width, hiddenLineCount);
		const room = width - 2;
		const rule = hiddenLineCount > 0 ? visibleWidth(` ↓ ${hiddenLineCount} more `) + 2 : 1;
		let tail = "";
		try {
			const data = this.gather();
			const view: View = { tokens: true, provider: true, cost: true, context: true, model: true };
			const stages: Array<() => void> = [
				() => {},
				() => (view.tokens = false),
				() => (view.provider = false),
				() => (view.cost = false),
				() => (view.context = false),
				() => (view.model = false),
			];
			for (const stage of stages) {
				stage();
				const pills = this.pills(view, data);
				tail = pills ? ` ${pills} ` : "";
				if (visibleWidth(tail) + rule <= room) break;
			}
		} catch {
			tail = "";
		}
		return (
			this.borderColor(BOTTOM_LEFT) +
			super.renderBottomBorder(room - visibleWidth(tail), hiddenLineCount) +
			tail +
			this.borderColor(BOTTOM_RIGHT)
		);
	}

	override render(width: number): string[] {
		const lines = super.render(width);
		const pad = this.getPaddingX();
		const first = lines[1];
		if (pad >= 2 && this.hiddenAbove === 0 && first?.startsWith(" ".repeat(pad))) {
			lines[1] = `${" ".repeat(pad - 2)}${this.borderColor(GLYPH)} ${first.slice(pad)}`;
		}
		return lines;
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setEditorComponent((tui, theme, keybindings) =>
			new PromptEditor(tui, theme, keybindings, { embedWorkingStatus: true }).attach(pi, ctx),
		);
	});
}
