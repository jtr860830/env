import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROMPT = "\u276f";

class PromptEditor extends CustomEditor {
	private hiddenAbove = 0;

	protected renderTopBorder(width: number, hiddenLineCount: number): string {
		this.hiddenAbove = hiddenLineCount;
		return super.renderTopBorder(width, hiddenLineCount);
	}

	render(width: number): string[] {
		const lines = super.render(width);
		const cells = Math.min(this.getPaddingX(), Math.max(0, Math.floor((width - 1) / 2)));
		const padding = " ".repeat(cells);
		const first = lines[1];
		if (cells >= 2 && this.hiddenAbove === 0 && first?.startsWith(padding)) {
			lines[1] = `${padding.slice(2)}${this.borderColor(PROMPT)} ${first.slice(cells)}`;
		}
		return lines;
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setEditorComponent(
			(tui, theme, keybindings) => new PromptEditor(tui, theme, keybindings, { embedWorkingStatus: true }),
		);
	});
}
