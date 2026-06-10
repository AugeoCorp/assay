import type { ShimTag } from "../../types";
import { firstSeen } from "./asset-registry";

/**
 * Builds a block-tag implementation for Shopify's asset tags
 * (`{% stylesheet %}`, `{% javascript %}`). The inner source is captured
 * verbatim — Liquid is never evaluated inside, matching Shopify — and emitted
 * at most once per page (see {@link firstSeen}), wrapped by `wrap`. Repeated
 * renders of the same snippet therefore contribute their asset only once.
 *
 * Dedup is keyed on the raw source, so two distinct snippets with byte-
 * identical content collapse to one emission. Shopify keys on the source file
 * instead, but identical-yet-separate assets are vanishingly rare in practice.
 */
export function assetBlock(
	name: string,
	wrap: (source: string) => string,
): ShimTag["implementation"] {
	const endName = `end${name}`;
	return {
		parse(_token, remainingTokens) {
			this.tokens = [];
			while (remainingTokens.length) {
				const next = remainingTokens.shift();
				if (next && "name" in next && next.name === endName) return;
				this.tokens.push(next);
			}
		},
		render(_context, emitter) {
			const source = this.tokens
				.map((token: { getText(): string }) => token.getText())
				.join("");
			if (firstSeen(`${name}:${source}`)) {
				emitter.write(wrap(source));
			}
		},
	};
}
