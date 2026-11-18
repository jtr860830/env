import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import { CustomEditor, type ExtensionAPI, type ExtensionContext, type ThemeColor } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";

interface Totals {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	hitRate: number | undefined;
}

interface View {
	tokens: boolean;
	provider: boolean;
	cost: boolean;
	context: boolean;
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

class InfoEditor extends CustomEditor {
	private pi!: ExtensionAPI;
	private ctx!: ExtensionContext;
	private hiddenAbove = 0;
	private cached: { key: string; usage: Totals; percent: number | null; window: number } | undefined;

	attach(pi: ExtensionAPI, ctx: ExtensionContext): this {
		this.pi = pi;
		this.ctx = ctx;
		return this;
	}

	private info(view: View): string {
		const ctx = this.ctx;
		const theme = ctx.ui.theme;
		const model = ctx.model;
		const key = `${ctx.sessionManager.getLeafId()}\n${model?.provider}\n${model?.id}`;
		if (!this.cached || this.cached.key !== key) {
			const context = ctx.getContextUsage();
			this.cached = { key, usage: sumUsage(ctx), percent: context?.percent ?? null, window: context?.contextWindow ?? model?.contextWindow ?? 0 };
		}
		const { usage, percent, window } = this.cached;
		const out: string[] = [];

		if (view.tokens) {
			const parts: string[] = [];
			if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
			if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
			if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
			if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
			if ((usage.cacheRead > 0 || usage.cacheWrite > 0) && usage.hitRate !== undefined) parts.push(`CH${usage.hitRate.toFixed(1)}%`);
			if (parts.length > 0) out.push(theme.fg("muted", parts.join(" ")));
		}

		const subscription = model ? ctx.modelRegistry.isUsingOAuth(model) : false;
		if (view.cost && (usage.cost || subscription)) {
			out.push(theme.fg("muted", `$${usage.cost.toFixed(3)}${subscription ? " sub" : ""}`));
		}

		if (view.context) {
			const color: ThemeColor = percent !== null && percent > 90 ? "error" : percent !== null && percent > 70 ? "warning" : "muted";
			out.push(theme.fg(color, `${percent === null ? "?" : `${percent.toFixed(1)}%`}/${formatTokens(window)}`));
		}

		const level: ThinkingLevel | undefined = model?.reasoning ? this.pi.getThinkingLevel() : undefined;
		const provider = model?.provider && view.provider ? `${model.provider}/` : "";
		out.push(theme.fg("muted", `${provider}${model?.id ?? "no-model"}${level ? ` ${level === "off" ? "thinking off" : level}` : ""}`));
		return out.join(theme.fg("muted", "  "));
	}

	override setPaddingX(_padding: number): void {
		super.setPaddingX(2);
	}

	protected override renderTopBorder(width: number, hiddenLineCount: number): string {
		this.hiddenAbove = hiddenLineCount;
		return super.renderTopBorder(width, hiddenLineCount);
	}

	override render(width: number): string[] {
		const lines = super.render(width);
		const pad = this.getPaddingX();
		const first = lines[1];
		if (pad >= 2 && this.hiddenAbove === 0 && first?.startsWith(" ".repeat(pad))) {
			const glyph = this.getText().trimStart().startsWith("!") ? "$" : "\u276f";
			lines[1] = `${" ".repeat(pad - 2)}${this.borderColor(glyph)} ${first.slice(pad)}`;
		}
		return lines;
	}

	protected override renderBottomBorder(width: number, hiddenLineCount: number): string {
		const scroll = hiddenLineCount > 0 ? visibleWidth(` ↓ ${hiddenLineCount} more `) + 6 : 1;
		try {
			const view: View = { tokens: true, provider: true, cost: true, context: true };
			const stages: Array<() => void> = [() => {}, () => (view.tokens = false), () => (view.provider = false), () => (view.cost = false), () => (view.context = false)];
			for (const stage of stages) {
				stage();
				const text = this.info(view);
				const rest = width - visibleWidth(text) - 4;
				if (rest < scroll) continue;
				return `${super.renderBottomBorder(rest, hiddenLineCount)}${this.borderColor(" ")}${text}${this.borderColor(" ──")}`;
			}
		} catch {}
		return super.renderBottomBorder(width, hiddenLineCount);
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setEditorComponent((tui, theme, keybindings) => new InfoEditor(tui, theme, keybindings, { embedWorkingStatus: true }).attach(pi, ctx));
	});
}
