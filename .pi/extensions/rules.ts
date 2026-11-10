import * as fs from "node:fs";
import * as path from "node:path";
import { type ExtensionAPI, parseFrontmatter } from "@earendil-works/pi-coding-agent";

const RULE_DIRS = [".pi/rules", ".claude/rules"];
const PATH_TOOLS = new Set(["read", "edit", "write"]);
const CUSTOM_TYPE = "rule";

interface Rule {
	id: string;
	patterns: RegExp[];
	body: string;
}

function globToRegExp(glob: string): RegExp {
	let re = "";
	for (let i = 0; i < glob.length; i++) {
		const c = glob[i];
		if (c === "*" && glob[i + 1] === "*") {
			i++;
			if (glob[i + 1] === "/") {
				i++;
				re += "(?:.*/)?";
			} else re += ".*";
		} else if (c === "*") re += "[^/]*";
		else if (c === "?") re += "[^/]";
		else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	}
	return new RegExp(`^${re}$`);
}

function findRoot(cwd: string): string | undefined {
	let dir = cwd;
	for (;;) {
		if (RULE_DIRS.some((d) => fs.existsSync(path.join(dir, d)))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

function loadRules(root: string): Rule[] {
	const rules: Rule[] = [];
	for (const dir of RULE_DIRS) {
		const abs = path.join(root, dir);
		if (!fs.existsSync(abs)) continue;
		for (const entry of fs.readdirSync(abs).sort()) {
			if (!entry.endsWith(".md")) continue;
			const { frontmatter, body } = parseFrontmatter<{ paths?: unknown }>(fs.readFileSync(path.join(abs, entry), "utf-8"));
			const globs = Array.isArray(frontmatter.paths) ? frontmatter.paths.filter((p): p is string => typeof p === "string") : [];
			if (globs.length === 0) continue;
			rules.push({ id: `${dir}/${entry}`, patterns: globs.map(globToRegExp), body: body.trim() });
		}
	}
	return rules;
}

export default function (pi: ExtensionAPI) {
	let root: string | undefined;
	let rules: Rule[] = [];
	const injected = new Set<string>();
	let watchers: fs.FSWatcher[] = [];
	let reloadTimer: ReturnType<typeof setTimeout> | undefined;

	const reload = () => {
		if (!root) return;
		const previous = new Map(rules.map((r) => [r.id, r.body]));
		rules = loadRules(root);
		for (const rule of rules) if (previous.get(rule.id) !== rule.body) injected.delete(rule.id);
	};

	const watch = () => {
		for (const w of watchers) w.close();
		watchers = [];
		if (!root) return;
		for (const dir of RULE_DIRS) {
			const abs = path.join(root, dir);
			if (!fs.existsSync(abs)) continue;
			watchers.push(
				fs.watch(abs, () => {
					clearTimeout(reloadTimer);
					reloadTimer = setTimeout(reload, 200);
				}),
			);
		}
	};

	pi.on("session_shutdown", async () => {
		for (const w of watchers) w.close();
		watchers = [];
	});

	pi.on("session_start", async (_event, ctx) => {
		root = findRoot(ctx.cwd);
		rules = root ? loadRules(root) : [];
		watch();
		injected.clear();
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message") continue;
			const message = entry.message;
			if (message.role === "custom" && message.customType === CUSTOM_TYPE) {
				const id = (message.details as { id?: string } | undefined)?.id;
				if (id) injected.add(id);
			}
		}
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!root || !PATH_TOOLS.has(event.toolName)) return;
		const target = (event.input as { path?: string }).path;
		if (!target) return;
		const rel = path.relative(root, path.resolve(ctx.cwd, target));
		if (rel.startsWith("..") || path.isAbsolute(rel)) return;

		const hits = rules.filter((r) => !injected.has(r.id) && r.patterns.some((p) => p.test(rel)));
		if (hits.length === 0) return;

		for (const rule of hits) {
			injected.add(rule.id);
			pi.sendMessage({
				customType: CUSTOM_TYPE,
				content: `Guidance from ${rule.id}, which applies to ${rel}:\n\n${rule.body}`,
				display: false,
				details: { id: rule.id },
			});
		}
		const names = hits.map((r) => r.id).join(", ");
		if (ctx.hasUI) ctx.ui.notify(`Loaded ${names}`, "info");
		if (event.toolName === "read") return;
		return {
			block: true,
			reason: `${names} applies to ${rel}. Its content is now in your context as a message; do not read the file. Apply it and retry the ${event.toolName}.`,
		};
	});
}
