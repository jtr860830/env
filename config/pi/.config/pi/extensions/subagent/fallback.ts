import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type AgentConfig, discoverAgents, parseThinkingLevel, THINKING_LEVELS } from "./agents.ts";

const QUOTA_ERROR =
	/usage limit|credit balance|billing|insufficient_quota|out of budget|quota exceeded|available balance|spend limit/i;
const EXHAUSTED_TTL_MS = 15 * 60 * 1000;
const PROVIDER = "subagent";

function exhaustedFile(): string {
	const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
	return path.join(stateHome, "pi", "extensions", "subagent", "exhausted-providers.json");
}

function readExhausted(): Record<string, number> {
	try {
		const all: unknown = JSON.parse(fs.readFileSync(exhaustedFile(), "utf-8"));
		if (!all || typeof all !== "object") return {};
		const now = Date.now();
		return Object.fromEntries(
			Object.entries(all).filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > now),
		);
	} catch {
		return {};
	}
}

function markExhausted(provider: string): void {
	const file = exhaustedFile();
	const tmp = `${file}.${process.pid}.tmp`;
	try {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(tmp, JSON.stringify({ ...readExhausted(), [provider]: Date.now() + EXHAUSTED_TTL_MS }));
		fs.renameSync(tmp, file);
	} catch {
		fs.rmSync(tmp, { force: true });
	}
}

function providerOf(model: string): string {
	return model.slice(0, model.indexOf("/"));
}

function chainOf(agent: AgentConfig | undefined): string[] | undefined {
	return agent?.model && agent.fallback?.length ? [agent.model, ...agent.fallback] : undefined;
}

export function fallbackModel(agent: AgentConfig): string | undefined {
	return chainOf(agent) ? `${PROVIDER}/${agent.name}` : undefined;
}

export function registerFallback(pi: ExtensionAPI, agentName: string): void {
	const chain = chainOf(discoverAgents().find((agent) => agent.name === agentName));
	if (!chain) return;

	const unavailable = new Set<string>();
	const spentProviders = new Set<string>();
	const pinnedThinking = parseThinkingLevel(process.env.PI_SUBAGENT_THINKING);
	let current: string | undefined;

	const pick = (): string | undefined => {
		const usable = chain.filter((model) => !unavailable.has(model) && !spentProviders.has(providerOf(model)));
		const exhausted = readExhausted();
		return usable.find((model) => !(providerOf(model) in exhausted)) ?? usable[0];
	};

	pi.registerVirtualModel({
		provider: PROVIDER,
		id: agentName,
		name: `${agentName} (${chain.join(" > ")})`,
		thinkingLevels: THINKING_LEVELS,
		route(request, ctx) {
			while (true) {
				if (!current || unavailable.has(current) || spentProviders.has(providerOf(current))) current = pick();
				if (!current) throw new Error(`No model of the fallback chain is available: ${chain.join(", ")}`);
				const provider = providerOf(current);
				const model = ctx.modelRegistry.find(provider, current.slice(provider.length + 1));
				if (model && ctx.modelRegistry.hasConfiguredAuth(model)) {
					const thinkingLevel =
						pinnedThinking ?? pi.getSettings().modelThinkingLevels?.[current] ?? request.thinkingLevel;
					return { model, thinkingLevel };
				}
				unavailable.add(current);
			}
		},
	});

	pi.on("agent_before_settle", async (event, ctx) => {
		if (ctx.model?.provider !== PROVIDER || ctx.model.id !== agentName) return;

		let failed: AssistantMessage | undefined;
		const branch = ctx.sessionManager.getBranch();
		for (let i = branch.length - 1; i >= 0; i--) {
			const entry = branch[i];
			if (entry.type === "message" && entry.message.role === "assistant") {
				failed = entry.message;
				break;
			}
		}
		if (failed?.stopReason !== "error" || !QUOTA_ERROR.test(failed.errorMessage ?? "")) return;

		if (spentProviders.has(failed.provider)) return;
		spentProviders.add(failed.provider);
		markExhausted(failed.provider);
		if (!pick()) return;

		return {
			entries: [
				...event.entries,
				{
					type: "custom_message",
					customType: "subagent-fallback",
					content: `The previous model (${failed.provider}/${failed.model}) ran out of quota in the middle of this task. Continue the same task from where it stopped; do not repeat steps whose results are already above.`,
					display: false,
				},
			],
			continue: true,
		};
	});
}
