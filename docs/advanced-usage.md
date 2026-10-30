# Advanced Usage

- [Web Components](#web-components)
- [Inline Templates](#inline-templates)
- [Preset Overrides](#preset-overrides)
  - [Cross-browser testing](#cross-browser-testing)
- [Mocking](#mocking)
- [Custom Filters](#custom-filters)
- [Custom Tags](#custom-tags)

## Web Components

Templates with `<script>` tags work. Scripts are executed after rendering. Use
`waitForElements` to wait for custom elements to upgrade before asserting:

📄 See example:

- [snippet](../example/theme/snippets/toggle-switch.liquid)
- [test](../example/tests/snippets/toggle-switch.test.ts)

```typescript
await render(
	"toggle-switch",
	{ label: "Enable notifications" },
	{ waitForElements: ["toggle-switch"] },
);
```

### `render` Options

| Parameter                 | Type                       | Description                                                                |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `input`                   | `string \| LiquidTemplate` | Template filename (without `.liquid` extension) or an inline `liquid\`…\`` |
| `data`                    | `Record<string, unknown>`  | Template variables                                                         |
| `options.waitForElements` | `string[]`                 | Custom element tags to wait for before returning                           |

Previous renders are cleaned up automatically: the page holds one render at a
time. When renders overlap, such as several in a `Promise.all`, the one that
finishes last stays on the page. Each returned container still holds its own
output.

## Inline Templates

For small tests, an inline `liquid` tagged template is often clearer than a
separate `.liquid` fixture file. Pass the result to `render` exactly like a
filename:

```typescript
import { liquid, render } from "@augeo/assay";

await render(liquid`<div data-testid="price">{{ amount | money }}</div>`, {
	amount: 1000,
});
```

### Interpolation

`${...}` values are concatenated into the source string before the template is
parsed, so you can splice in dynamic property names or test labels:

```typescript
const property = "color";

await render(liquid`{{ product.metafields.${property} }}`, {
	product: { metafields: { color: "red" } },
});
```

⚠️ Don't interpolate user/runtime input that might contain Liquid syntax — it
will be re-parsed by the engine. In test fixtures this is a footgun, not a
security boundary, but worth knowing.

### When to use which

- **Inline (`liquid\`…\``)** — single-purpose tests, one or two tags or filters
  per snippet, no shared template surface.
- **Fixture file** — anything substantial, anything reused across tests, or
  anything that loads other assets (e.g. `inline_asset_content` reads a real SVG
  from `tests/fixtures/assets/`).

## Preset Overrides

`assayPreset` accepts an optional second argument for
[Vitest config](https://vitest.dev/config/) and
[browser mode](https://vitest.dev/guide/browser/#configuration) overrides:

```typescript
import { assayPreset } from "@augeo/assay/preset";

export default assayPreset(
	{ liquidPaths: ["./theme/snippets"] },
	{
		test: {
			setupFiles: ["./tests/setup.ts"],
			browser: { headless: false },
		},
	},
);
```

Overrides are merged with Assay's defaults. Use
[`setupFiles`](https://vitest.dev/config/#setupfiles) to load custom filters and
tags before tests run. The `test.browser` object is spread on top of the
defaults (chromium, headless), so you can override individual settings without
losing the rest.

### Cross-browser testing

Run your tests across multiple browsers by adding instances:

```typescript
export default assayPreset(
	{ liquidPaths: ["./theme/snippets"] },
	{
		test: {
			browser: {
				instances: [
					{ browser: "chromium" },
					{ browser: "firefox" },
					{ browser: "webkit" },
				],
			},
		},
	},
);
```

Each browser runs the full test suite. Setup the browsers you need:

Chrome

```bash
npx playwright install chromium
```

Firefox

```bash
npx playwright install firefox
```

Safari

```bash
npx playwright install webkit
```

### Options

| Option        | Default          | Description                                                 |
| ------------- | ---------------- | ----------------------------------------------------------- |
| `liquidPaths` | `['./snippets']` | Directories containing `.liquid` template files             |
| `assetsPath`  | `'assets'`       | Directory for theme assets (used by the `asset_url` filter) |

## Mocking

Mock nested `{% render %}` calls to test a template in isolation. When a
template is mocked, LiquidJS returns the mock content instead of loading the
real file.

### Module-level mock

Set once at the top of a test file. Persists for all tests in that file — same
pattern as `vi.mock`.

📄 [See example](../example/tests/sections/hero.test.ts)

```typescript
import { mock, render } from "@augeo/assay";

mock("button", "<span data-testid='mock-button'>{{ text }}</span>");

describe("hero.liquid", () => {
	it("renders the mock", async () => {
		await render("hero", { ... });
		await expect.element(page.getByTestId("mock-button")).toBeVisible();
	});
});
```

### Scoped mock

Use `beforeEach` and `afterEach` to scope a mock to a single describe block.

```typescript
import { mock, render, unmock } from "@augeo/assay";

describe("hero.liquid", () => {
	describe("with a mocked button", () => {
		beforeEach(() => mock("button", "<span>{{ text }}</span>"));
		afterEach(() => unmock("button"));

		it("renders the mock", async () => {
			await render("hero", { ... });
			// ...
		});
	});

	describe("without the mock", () => {
		it("renders the real button", async () => {
			await render("hero", { ... });
			// ...
		});
	});
});
```

Mocks are Liquid templates — they receive the same variables that
`{% render 'name', key: value %}` passes.

Mocks do not bleed between test files. Each file starts with a clean state.

## Custom Filters

Register additional Shopify filters that Assay doesn't yet mock. Do this in a
setup file that runs before your tests:

📄 [See example](../example/tests/setup.ts)

```typescript
// tests/setup.ts
import { registerFilter } from "@augeo/assay";

registerFilter("upcase_first", (value) => {
	const str = String(value ?? "");
	return str.charAt(0).toUpperCase() + str.slice(1);
});
```

## Custom Tags

Register custom Liquid tags the same way:

```typescript
import { registerTag } from "@augeo/assay";

registerTag("my_tag", {
	parse(token, remainingTokens) {
		// consume tokens
	},
	render(ctx, emitter) {
		// emit output
	},
});
```

See the
[LiquidJS tag documentation](https://liquidjs.com/tutorials/register-filters-tags.html)
for implementation details.
