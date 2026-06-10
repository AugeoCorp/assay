// End-to-end check that `{% stylesheet %}` / `{% javascript %}` dedup survives
// the `{% render %}` boundary. Each `{% render %}` spawns a fresh LiquidJS
// Context with empty registers, so register-based state would re-emit every
// time. The Assay shims dedup at page scope instead, so a snippet rendered N
// times contributes its asset exactly once — matching Shopify.
//
// styled-card.liquid carries both a stylesheet and a javascript block plus a
// run-counter, so this exercises the real partial-resolution path, not an
// inline proxy.

import { describe, expect, it } from "vitest";
import { liquid, render } from "../src/index";

declare global {
	interface Window {
		__assayCardRuns?: number;
	}
}

describe("asset tag dedup across {% render %}", () => {
	it("emits each asset once no matter how many times the snippet renders", async () => {
		window.__assayCardRuns = 0;
		const container = await render(liquid`
{% render 'styled-card', label: 'a' %}
{% render 'styled-card', label: 'b' %}
{% render 'styled-card', label: 'c' %}
		`);

		// The snippet itself rendered three times...
		expect(container.querySelectorAll(".card")).toHaveLength(3);

		// ...but its CSS and JS were emitted (and the JS ran) exactly once.
		expect(container.querySelectorAll("style")).toHaveLength(1);
		expect(container.querySelectorAll("script")).toHaveLength(1);
		expect(window.__assayCardRuns).toBe(1);
	});

	it("re-emits on a fresh page render", async () => {
		window.__assayCardRuns = 0;
		const container = await render(
			liquid`{% render 'styled-card', label: 'a' %}`,
		);
		// A new render() is a new page, so the reset registry emits again.
		expect(container.querySelectorAll("style")).toHaveLength(1);
		expect(window.__assayCardRuns).toBe(1);
	});
});
