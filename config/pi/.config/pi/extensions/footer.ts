import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

function statusLines(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.replace(/[\r\t]/g, " ").trimEnd())
		.filter((line) => line.trim() !== "");
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setFooter((_tui, theme, footerData) => ({
			invalidate() {},
			render(total: number): string[] {
				const margin = total > 1 ? " " : "";
				const width = total - margin.length;
				const statuses = [...footerData.getExtensionStatuses().entries()]
					.sort(([a], [b]) => a.localeCompare(b))
					.flatMap(([, text]) => statusLines(text))
					.map((line) => margin + truncateToWidth(theme.fg("muted", line), width, "…"));
				return statuses.length > 0 ? statuses : [""];
			},
		}));
	});
}
