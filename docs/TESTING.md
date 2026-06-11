# Testing

Conventions for writing tests in TabulaRasa. Most of this is project-agnostic
guidance adapted from [betterspecs.org](https://www.betterspecs.org/) and
[bettertests.js.org](https://bettertests.js.org/).

The test runner is [Vitest](https://vitest.dev/) in Browser Mode via
[`@augeo/assay`](https://www.npmjs.com/package/@augeo/assay). Tests run against
the **built** theme directories (`sections/`, `snippets/`, `blocks/`), since
assay / LiquidJS cannot resolve the `@/...` source alias.

- [Describe Your Files](#describe-your-files)
  - [When the Filename Doesn't Match the Exports / Multiple Exports](#when-the-filename-doesnt-match-the-exports--multiple-exports)
- [Nest Describes to Add Context](#nest-describes-to-add-context)
- [Use `it` to Describe the Expected Behavior](#use-it-to-describe-the-expected-behavior)
- [Single Expectation Tests](#single-expectation-tests)
- [Use Subjects](#use-subjects)
- [Before / After Hooks Should Be Single Concern](#before--after-hooks-should-be-single-concern)
- [Don't Use 'should'](#dont-use-should)
- [Describe the Expected Behavior / What the User Will See](#describe-the-expected-behavior--what-the-user-will-see)
- [Use Factories](#use-factories)
- [When to Mock](#when-to-mock)
- [Inspiration](#inspiration)

## Describe Your Files

Usually a file should have a single named export that's named the same as the
containing file. In this case your root `describe` should be the exported
object.

#### Bad

```ts
describe("a Hamburger Menu component", () => {});
describe("a function that describes sandwiches", () => {});
describe("a constant holding our ingredients", () => {});
```

#### Good

```ts
describe("<HamburgerMenu />", () => {});
describe("describeSandwiches()", () => {});
describe("ingredients", () => {});
```

For Liquid components, name the describe after the component file:

```ts
describe("button.liquid", () => {});
describe("hero.liquid", () => {});
```

### When the Filename Doesn't Match the Exports / Multiple Exports

If you have multiple exports in a file or the file name doesn't match the export
name, use a root-level describe for the file that's as short as possible while
still being descriptive, then nest describes per export.

#### Bad

```ts
describe("addPickles()", () => {});
describe("removePickles()", () => {});
```

#### Good

```ts
describe("pickleManager", () => {
	describe("addPickles()", () => {});
	describe("removePickles()", () => {});
});
```

## Nest Describes to Add Context

Use nested describes to add context — they keep tests clear and well organized.
When describing a context, start its description with `when`, `as`, `with`, or
`without`.

Nested describes are also useful to group tests that share setup or mock
requirements. `beforeEach` is preferred for isolation; reach for `beforeAll`
only when setup is expensive.

#### Bad

```ts
it("shows order details when logged in", () => {});
it("redirects to login when logged out", () => {});
```

#### Good

```ts
describe("when logged in", () => {
	beforeEach(setupValidSession);

	it("shows order details", () => {});
});

describe("when logged out", () => {
	beforeEach(setupInvalidSession);

	it("redirects to login", () => {});
});
```

## Use `it` to Describe the Expected Behavior

#### Bad

```ts
test("constructs a sandwich", () => {});
```

#### Good

```ts
it("constructs a sandwich", () => {});
```

## Single Expectation Tests

Each test should specify one (and only one) behavior. Multiple expectations in
the same test usually signal you're specifying multiple behaviors — but there
are cases where multiple expectations support a single behavior.

When a test fails, it should be immediately clear what behavior is broken.

#### Bad

```ts
it("renders the product card", async () => {
	await render("product-card", { product });

	await expect.element(page.getByText("Classic Tee")).toBeVisible();
	await expect.element(page.getByText("$29.99")).toBeVisible();
});
```

#### Good

```ts
describe("content", () => {
	beforeEach(() => render("product-card", { product }));

	it("shows the product title", async () => {
		await expect.element(page.getByText("Classic Tee")).toBeVisible();
	});

	it("shows the formatted price", async () => {
		await expect.element(page.getByText("$29.99")).toBeVisible();
	});
});
```

Multiple expectations supporting one behavior are fine:

```ts
it("formats discounts", async () => {
	// Both expectations describe one behavior: the discount styling.
	await expect.element(page.getByText("Sale")).toHaveClass("discount");
	await expect.element(page.getByText("Sale")).not.toHaveClass("full-price");
});
```

## Use Subjects

If you have several tests related to the same subject, use a `describe` block to
DRY them up.

#### Bad

```ts
it("shows the title", async () => {
	await render("product-card", { product: { title: "Clubhouse" } });
	await expect.element(page.getByText("Clubhouse")).toBeVisible();
});

it("shows the description", async () => {
	await render("product-card", { product: { title: "Clubhouse" } });
	await expect.element(page.getByText("A delicious sandwich")).toBeVisible();
});
```

#### Good

```ts
describe("content", () => {
	beforeEach(() => render("product-card", { product: { title: "Clubhouse" } }));

	it("shows the title", async () => {
		await expect.element(page.getByText("Clubhouse")).toBeVisible();
	});

	it("shows the description", async () => {
		await expect.element(page.getByText("A delicious sandwich")).toBeVisible();
	});
});
```

## Before / After Hooks Should Be Single Concern

Lifecycle hooks should each relate to a single concern. Biome's
`noDuplicateTestHooks` rule is disabled in `biome.json` to allow this pattern.

#### Bad

```ts
describe("with lettuce", () => {
	beforeEach(() => {
		sandwich.addLettuce();
		restaurant.build(sandwich);
	});
});
```

#### Good

```ts
describe("with lettuce", () => {
	beforeEach(() => sandwich.addLettuce());
	beforeEach(() => restaurant.build(sandwich));
});
```

## Don't Use 'should'

Don't use "should" when describing tests. Use the third person, present tense.

#### Bad

```ts
it("should return a sandwich", () => {});
```

#### Good

```ts
it("returns a sandwich", () => {});
```

## Describe the Expected Behavior / What the User Will See

Describe and test the expected behavior, not implementation details. See
[Testing Library's guiding principles](https://testing-library.com/docs/guiding-principles).

#### Bad

```ts
it("fetches order from the DB", () => {});
it("calls 'showToast'", () => {});
```

#### Good

```ts
it("returns the order's details", () => {});
it("shows a success message", () => {});
```

## Use Factories

Don't use fixtures — they're hard to control. Use factories instead to reduce
verbosity when creating test data.

## When to Mock

Don't overuse mocks. They're useful when you need to isolate the interface of a
dependency. In a strongly-typed language, type-checking already gives you a lot
of that confidence — calling through to the real implementation is often fine
when it's cheap.

That said, asserting that a dependency was called (rather than relying on its
side effects) can be valuable: it decouples your test from the dependency's
implementation.

> Mock-based tests are more coupled to the interfaces in your system, while
> classical tests are more coupled to the implementation of an object's
> collaborators.
>
> —
> [Thoughts on Mocking](https://web.archive.org/web/20220612005103/http://myronmars.to/n/dev-blog/2012/06/thoughts-on-mocking)

For mocking nested `{% render %}` calls in Liquid tests, see the
[`@augeo/assay` mocking docs](https://github.com/seanhealy/assay/blob/main/docs/advanced-usage.md#mocking).

## Inspiration

Most of this guidance comes from [betterspecs.org](https://www.betterspecs.org/)
— written for RSpec but a great guide for tests in general. Some additional
guidance from [bettertests.js.org](https://bettertests.js.org/).
