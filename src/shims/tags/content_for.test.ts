// Shopify reference: https://shopify.dev/docs/api/liquid/tags/content_for
// `{% content_for %}` designates an area where theme blocks render. The blocks
// themselves come from theme config (JSON templates / section groups) that
// sits above the Liquid layer, so the Assay shim treats the tag as a seam: it
// emits one inert <script type="application/json"> data island per block,
// letting tests assert which blocks were injected (and with what data) without
// resolving any blocks/*.liquid partial.

import { beforeEach, describe, expect, it } from "vitest";
import { liquid, render } from "@";

const ISLAND = '[data-testid="content-for-block"]';

function islandPayload(container: HTMLElement) {
	return JSON.parse(container.querySelector(ISLAND)?.textContent ?? "null");
}

describe("content_for tag", () => {
	describe('"blocks" (dynamic)', () => {
		describe("with a configured block", () => {
			let container: HTMLElement;
			beforeEach(async () => {
				container = await render(
					liquid`<section>{% content_for "blocks" %}</section>`,
					{
						section: {
							blocks: [
								{ type: "slide", id: "s1", settings: { heading: "Hello" } },
							],
						},
					},
				);
			});

			it("renders the block as a data island", () => {
				expect(container.innerHTML).toMatchSnapshot();
			});

			it("nests the block settings in the payload", () => {
				expect(islandPayload(container).settings).toEqual({ heading: "Hello" });
			});

			it("uses the block id as the island id", () => {
				expect(
					container.querySelector(ISLAND)?.getAttribute("data-block-id"),
				).toBe("s1");
			});
		});

		describe("with several configured blocks", () => {
			let islands: NodeListOf<Element>;
			beforeEach(async () => {
				const container = await render(
					liquid`<section>{% content_for "blocks" %}</section>`,
					{
						section: {
							blocks: [
								{ type: "slide", id: "s1", settings: {} },
								{ type: "slide", id: "s2", settings: {} },
							],
						},
					},
				);
				islands = container.querySelectorAll(ISLAND);
			});

			it("renders one island per block", () => {
				expect(islands).toHaveLength(2);
			});

			it("preserves the block order", () => {
				expect(
					[...islands].map((el) => el.getAttribute("data-block-id")),
				).toEqual(["s1", "s2"]);
			});
		});

		describe("without configured blocks", () => {
			it("renders nothing when section.blocks is empty", async () => {
				const container = await render(liquid`{% content_for "blocks" %}`, {
					section: { blocks: [] },
				});
				expect(container.querySelectorAll(ISLAND)).toHaveLength(0);
			});

			it("renders nothing when section is absent", async () => {
				const container = await render(liquid`{% content_for "blocks" %}`, {});
				expect(container.querySelectorAll(ISLAND)).toHaveLength(0);
			});
		});

		describe("when a block omits an id", () => {
			it("falls back to a positional id", async () => {
				const container = await render(liquid`{% content_for "blocks" %}`, {
					section: { blocks: [{ type: "slide", settings: {} }] },
				});
				expect(
					container.querySelector(ISLAND)?.getAttribute("data-block-id"),
				).toBe("block-0");
			});
		});

		describe("when a setting contains a </script> sequence", () => {
			it("keeps the data island intact", async () => {
				const container = await render(liquid`{% content_for "blocks" %}`, {
					section: {
						blocks: [
							{ type: "t", id: "x", settings: { html: "</script><b>x</b>" } },
						],
					},
				});
				expect(islandPayload(container).settings.html).toBe(
					"</script><b>x</b>",
				);
			});
		});
	});

	describe('"block" (static)', () => {
		describe("with type, id, and arbitrary params", () => {
			let container: HTMLElement;
			beforeEach(async () => {
				container = await render(
					liquid`{% content_for "block", type: "announcement", id: "a1", color: "red" %}`,
				);
			});

			it("renders the static block as a data island", () => {
				expect(container.innerHTML).toMatchSnapshot();
			});

			it("marks the island as static", () => {
				expect(
					container.querySelector(ISLAND)?.getAttribute("data-block-static"),
				).toBe("true");
			});

			it("carries arbitrary params at the top level of the payload", () => {
				expect(islandPayload(container)).toMatchObject({
					type: "announcement",
					id: "a1",
					color: "red",
				});
			});
		});
	});

	describe("with both a static and a dynamic block", () => {
		let container: HTMLElement;
		beforeEach(async () => {
			container = await render(
				liquid`<section>
{% content_for "block", type: "header", id: "h1" %}
{% content_for "blocks" %}
</section>`,
				{ section: { blocks: [{ type: "slide", id: "s1", settings: {} }] } },
			);
		});

		it("renders an island for each block", () => {
			expect(container.querySelectorAll(ISLAND)).toHaveLength(2);
		});

		it("distinguishes the static block from the dynamic one", () => {
			expect(
				container.querySelectorAll('[data-block-static="true"]'),
			).toHaveLength(1);
		});
	});
});
