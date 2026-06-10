// Shopify reference: https://shopify.dev/docs/api/liquid/tags/stylesheet
// `{% stylesheet %}` blocks hold a section/block/snippet's CSS. Shopify emits
// that CSS once per page, no matter how many times the owner renders. The Assay
// shim captures the raw CSS (Liquid is never evaluated inside) and emits it
// once per render() call, wrapped in a <style> tag.

import { describe, expect, it } from "vitest";
import { liquid, render } from "@";

describe("stylesheet tag", () => {
	it("emits the CSS inside a <style> tag", async () => {
		const container = await render(
			liquid`{% stylesheet %}.card { color: red; }{% endstylesheet %}`,
		);
		expect(container.querySelector("style")?.textContent).toContain(
			".card { color: red; }",
		);
	});

	it("emits a given stylesheet only once per page", async () => {
		const container = await render(liquid`
{% stylesheet %}.card { color: red; }{% endstylesheet %}
{% stylesheet %}.card { color: red; }{% endstylesheet %}
		`);
		expect(container.querySelectorAll("style")).toHaveLength(1);
	});

	it("emits distinct stylesheets separately", async () => {
		const container = await render(liquid`
{% stylesheet %}.a { color: red; }{% endstylesheet %}
{% stylesheet %}.b { color: blue; }{% endstylesheet %}
		`);
		expect(container.querySelectorAll("style")).toHaveLength(2);
	});

	it("resets dedup between page renders", async () => {
		await render(liquid`{% stylesheet %}.card{}{% endstylesheet %}`);
		// A fresh render() is a fresh page, so the same CSS emits again.
		const container = await render(
			liquid`{% stylesheet %}.card{}{% endstylesheet %}`,
		);
		expect(container.querySelector("style")?.textContent).toContain(".card{}");
	});

	it("does not evaluate Liquid inside the block", async () => {
		const container = await render(
			liquid`{% stylesheet %}.x::after { content: "{{ 1 | plus: 1 }}"; }{% endstylesheet %}`,
		);
		const css = container.querySelector("style")?.textContent ?? "";
		expect(css).toContain("{{ 1 | plus: 1 }}");
		expect(css).not.toContain('content: "2"');
	});
});
