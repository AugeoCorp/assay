import { describe, expect, it } from "vitest";
import { liquid, render } from "../src/index";

describe("render()", () => {
	describe("while another render is in flight", () => {
		it("rejects with an error telling the caller to await", async () => {
			const first = render(liquid`<p>first</p>`);
			const second = render(liquid`<p>second</p>`);

			await expect(second).rejects.toThrow("Await each render");
			await first;
		});
	});

	describe("after an awaited render", () => {
		it("renders", async () => {
			await render(liquid`<p>first</p>`);
			const container = await render(liquid`<p>second</p>`);

			expect(container.textContent).toBe("second");
		});
	});

	describe("after a failed render", () => {
		it("renders", async () => {
			await expect(render(liquid`{% if %}`)).rejects.toThrow();
			const container = await render(liquid`<p>after</p>`);

			expect(container.textContent).toBe("after");
		});
	});
});
