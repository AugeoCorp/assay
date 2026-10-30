import { describe, expect, it } from "vitest";
import { liquid, render } from "../src/index";

describe("render()", () => {
	describe("when renders overlap", () => {
		it("leaves exactly one root on the page", async () => {
			await Promise.all([
				render(liquid`<p>first</p>`),
				render(liquid`<p>second</p>`),
				render(liquid`<p>third</p>`),
			]);

			expect(document.querySelectorAll("[data-testroot]")).toHaveLength(1);
		});
	});
});
