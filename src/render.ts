import { Liquid } from "liquidjs";
import { LIQUID_URL_PREFIX } from "./constants";
import { createFetchFS } from "./fs-adapter";
import {
	registerDefaultFilters,
	registerDefaultTags,
	resetAssetRegistry,
} from "./shims";

export interface RenderOptions {
	/** Wait for specific custom elements to be defined before returning */
	waitForElements?: string[];
}

const TEMPLATE_BRAND: unique symbol = Symbol("liquidTemplate");

/**
 * A Liquid template authored inline via the {@link liquid} tagged template.
 * Distinguished from a filename string so {@link render} can statically tell
 * the two apart.
 */
export interface LiquidTemplate {
	readonly [TEMPLATE_BRAND]: true;
	readonly source: string;
}

/**
 * Tagged template for inline Liquid source. Use with {@link render} when a
 * test only needs a small snippet and a separate `.liquid` fixture would be
 * overkill.
 *
 * Interpolated `${}` values are concatenated as JS strings before parsing —
 * convenient for dynamic property names or test labels. Don't interpolate
 * user/runtime input that might contain Liquid syntax: it would be re-parsed
 * by the engine. Test fixtures are author-controlled, so this is a footgun
 * concern only, not a security one.
 *
 * @example
 * ```ts
 * await render(liquid`<div>{{ 'cart.js' | asset_url }}</div>`);
 * ```
 */
export function liquid(
	strings: TemplateStringsArray,
	...values: unknown[]
): LiquidTemplate {
	let source = strings[0];
	for (let index = 0; index < values.length; index++) {
		source += String(values[index]) + strings[index + 1];
	}
	return { [TEMPLATE_BRAND]: true, source };
}

function isLiquidTemplate(value: unknown): value is LiquidTemplate {
	return typeof value === "object" && value !== null && TEMPLATE_BRAND in value;
}

/**
 * Renders a Liquid template into the live browser DOM.
 *
 * @param input - Either a template filename (without extension) or an inline
 *   {@link LiquidTemplate} produced by the {@link liquid} tag.
 * @param data - Template variables passed to the Liquid template
 * @param options - Additional rendering options
 * @returns The container HTMLElement wrapping the rendered output
 *
 * @example
 * ```ts
 * // From a fixture file (tests/fixtures/snippets/button.liquid):
 * const container = await render('button', { text: 'Click me' });
 *
 * // Inline:
 * const container = await render(
 *   liquid`<div>{{ 'cart.js' | asset_url }}</div>`,
 * );
 * ```
 */
export async function render(
	input: string | LiquidTemplate,
	data: Record<string, unknown> = {},
	options: RenderOptions = {},
): Promise<HTMLElement> {
	const { waitForElements = [] } = options;
	const engine = getEngine();

	// Clean up previous test render
	const existing = document.querySelector("[data-testroot]");
	if (existing) existing.remove();

	// Reset per-page asset dedup so {% stylesheet %} / {% javascript %} emit
	// once per render() call (Shopify's "once per page").
	resetAssetRegistry();

	// Render Liquid → HTML string
	const html = isLiquidTemplate(input)
		? await engine.parseAndRender(input.source, data)
		: await engine.renderFile(input, data);

	// Inject into live browser DOM
	const container = document.createElement("div");
	container.setAttribute("data-testroot", "");
	container.innerHTML = html;
	activateScripts(container);
	document.body.appendChild(container);

	// Wait for specified custom elements to upgrade
	if (waitForElements.length > 0) {
		await Promise.all(
			waitForElements.map((tag) =>
				customElements.whenDefined(tag).catch(() => {
					// Silently ignore if element is not registered
				}),
			),
		);
	}

	return container;
}

/**
 * Registers a custom Liquid filter on the engine.
 *
 * @example
 * ```ts
 * registerFilter('highlight', (val) => `<mark>${val}</mark>`);
 * ```
 */
export function registerFilter(
	name: string,
	fn: (...args: unknown[]) => unknown,
): void {
	getEngine().registerFilter(name, fn);
}

/**
 * Registers a custom Liquid tag on the engine.
 * See LiquidJS docs for tag implementation details.
 */
export function registerTag(
	name: string,
	tag: Parameters<Liquid["registerTag"]>[1],
): void {
	getEngine().registerTag(name, tag);
}

let engine: Liquid | undefined;

/** Returns the current LiquidJS engine, creating one if needed. */
function getEngine(): Liquid {
	return engine ?? createEngine();
}

function createEngine(): Liquid {
	const fs = createFetchFS(LIQUID_URL_PREFIX);

	engine = new Liquid({
		fs,
		root: "",
		partials: "",
		extname: ".liquid",
	});

	registerDefaultFilters(engine);
	registerDefaultTags(engine);

	return engine;
}

/**
 * innerHTML doesn't execute script tags. This replaces each script
 * element with a fresh clone so the browser treats it as new and
 * executes it.
 */
function activateScripts(container: HTMLElement): void {
	for (const original of container.querySelectorAll("script")) {
		const script = document.createElement("script");
		for (const attr of original.attributes) {
			script.setAttribute(attr.name, attr.value);
		}
		script.textContent = original.textContent;
		original.replaceWith(script);
	}
}
