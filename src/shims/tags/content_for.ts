import {
	type Context,
	type Emitter,
	Hash,
	Tokenizer,
	type ValueToken,
} from "liquidjs";
import type { ShimTag } from "../types";

export default {
	type: "tag",
	name: "content_for",
	status: "mock",
	implementation: contentForImplementation(),
} satisfies ShimTag;

/**
 * Shims Shopify's `{% content_for %}` as a test seam. Rather than deep-rendering
 * theme blocks (which live in theme config above the Liquid layer), it emits one
 * inert JSON data island per block so tests can assert which blocks were injected,
 * in what order, with what data — without resolving any `blocks/*.liquid` partial.
 *
 *   {% content_for "blocks" %}                    → one island per section.blocks entry
 *   {% content_for "block", type:…, id:…, … %}    → one island for the static block
 *
 * Block files are tested separately by rendering them directly with a mocked
 * `block`. See https://shopify.dev/docs/api/liquid/tags/content_for.
 */
function contentForImplementation(): ShimTag["implementation"] {
	return {
		parse(token) {
			const tokenizer = new Tokenizer(token.args);
			this.form = readForm(tokenizer.readValue());
			// Hash reads the remaining `key: value` params (static-block form).
			this.hash = new Hash(tokenizer);
		},
		*render(context, emitter) {
			if (this.form === "blocks") {
				readSectionBlocks(context).forEach((block, index) => {
					emitBlock(emitter, dynamicAttributes(block, index), block);
				});
				return;
			}
			if (this.form === "block") {
				const params = (yield this.hash.render(context)) as Record<
					string,
					unknown
				>;
				emitBlock(emitter, staticAttributes(params), params);
				return;
			}
			console.warn(`content_for: unsupported form "${this.form}"`);
		},
	};
}

/** Reads the leading `"blocks"` / `"block"` literal that selects the form. */
function readForm(token: ValueToken | undefined): string {
	if (!token) return "";
	if ("content" in token && typeof token.content === "string") {
		return token.content;
	}
	return token
		.getText()
		.trim()
		.replace(/^['"]|['"]$/g, "");
}

/** Materialized theme blocks the merchant configured, mocked via render data. */
function readSectionBlocks(context: Context): unknown[] {
	let blocks: unknown;
	try {
		blocks = context.getSync(["section", "blocks"]);
	} catch {
		blocks = undefined;
	}
	return Array.isArray(blocks) ? blocks : [];
}

function dynamicAttributes(
	block: unknown,
	index: number,
): Record<string, string> {
	const record = isRecord(block) ? block : {};
	return {
		"data-block-type": String(record.type ?? ""),
		"data-block-id": String(record.id ?? `block-${index}`),
	};
}

function staticAttributes(
	params: Record<string, unknown>,
): Record<string, string> {
	return {
		"data-block-static": "true",
		"data-block-type": String(params.type ?? ""),
		"data-block-id": String(params.id ?? ""),
	};
}

/** Emits one inert `<script type="application/json">` carrying the block. */
function emitBlock(
	emitter: Emitter,
	attributes: Record<string, string>,
	payload: unknown,
): void {
	// Escape `<` so a `</script>` inside the payload can't close the tag early;
	// `<` is a valid JSON string escape that JSON.parse decodes back.
	const json = JSON.stringify(payload).replace(/</g, "\\u003c");
	const attrs = Object.entries(attributes)
		.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
		.join("");
	emitter.write(
		`<script type="application/json" data-testid="content-for-block"${attrs}>${json}</script>`,
	);
}

function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
