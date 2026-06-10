// Shopify reference: https://shopify.dev/docs/api/liquid/tags/javascript
// `{% javascript %}` blocks hold a section/block/snippet's JS, emitted once per
// page. The Assay shim captures the raw JS (Liquid is never evaluated inside)
// and emits it once per render() inside a <script> tag, which render() then
// activates so it actually runs.

import { describe, expect, it } from "vitest";
import { liquid, render } from "@";

declare global {
	interface Window {
		__assayJsRuns?: number;
	}
}

describe("javascript tag", () => {
	it("emits the JS inside a <script> tag", async () => {
		const container = await render(
			liquid`{% javascript %}var assayMarker = 1;{% endjavascript %}`,
		);
		expect(container.querySelector("script")?.textContent).toContain(
			"var assayMarker = 1;",
		);
	});

	it("runs a given script only once per page", async () => {
		window.__assayJsRuns = 0;
		await render(liquid`
{% javascript %}window.__assayJsRuns = (window.__assayJsRuns || 0) + 1;{% endjavascript %}
{% javascript %}window.__assayJsRuns = (window.__assayJsRuns || 0) + 1;{% endjavascript %}
		`);
		expect(window.__assayJsRuns).toBe(1);
	});

	it("does not evaluate Liquid inside the block", async () => {
		const container = await render(
			liquid`{% javascript %}var n = "{{ 1 | plus: 1 }}";{% endjavascript %}`,
		);
		expect(container.querySelector("script")?.textContent).toContain(
			"{{ 1 | plus: 1 }}",
		);
	});
});
