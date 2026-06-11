# Plan: `content_for` shim (placeholder / seam)

Working notes. Status: implemented.

## Why a seam, not real rendering

`{% content_for "blocks" %}` renders the theme blocks a merchant configured in
the JSON template / section group — data that lives **above** the Liquid layer.
Assay renders templates in isolation, so there's no block config in scope.
Rather than deep-render each `blocks/<type>.liquid` (which needs a data
convention + partial resolution + failure modes), the shim emits one inert JSON
**data island** per block. Tests assert _which_ blocks were injected, in what
order, with what data — without resolving any partial. Block files are tested
separately by rendering them directly with a mocked `block`.

This is a shallow-render boundary (à la React shallow rendering). It degrades to
a clean no-op when `section.blocks` is empty/absent, so simple section-shell
tests pay nothing.

## Input convention: `section.blocks`

Settled by precedent — existing tests already pass `section: { settings: {…} }`
(`hero-mocked`, `hero-no-bleed`, `mock-scoped`). `section.blocks` is just a
sibling property. Tests mock the **runtime object**, not the authoring JSON
file. A future `sectionFromJson()` helper could derive `section` from a JSON
template, layered on top — not baked in.

## Behavior

- **`status: "mock"`** — it's an approximation, not storefront-faithful.
- **`"blocks"` (dynamic):** read `ctx.getSync(["section","blocks"])`; for each
  block in order emit one island. Payload = whole block, `settings` nested.
- **`"block"` (static):** parse named args via `Hash` (`type`, `id`, +
  arbitrary); emit one island. Payload = whole params object, **top-level**
  (Shopify exposes static-block params as `{{ color }}`, not
  `{{ block.settings.color }}`). Tagged `data-block-static="true"`.
- Empty/absent `section.blocks` → emit nothing.
- `id` fallback → positional `block-<index>`.

## Output

```html
<script
	type="application/json"
	data-testid="content-for-block"
	data-block-type="slide"
	data-block-id="s1"
>
	{"id":"s1","type":"slide","settings":{…}}
</script>
```

- Carrier: `<script type="application/json">` — inert, won't execute, survives
  `render()`'s `activateScripts()` clone (attributes + textContent preserved).
- Escape `<` → `<` in the JSON so a `</script>` in the payload can't close the
  tag early; `JSON.parse` decodes it back. Attributes HTML-escaped.

## Honest asymmetry

Dynamic payload nests `settings`; static payload is top-level. Faithful to how
Shopify models the two forms. Documented, not forced to match.

## Files

- `src/shims/tags/content_for.ts` — shim (all logic inline; reuse rule: no
  `shared/` until a 2nd consumer).
- `src/shims/tags/content_for.test.ts` — inline templates + data, **no
  fixtures** (a seam renders no partials). Cases: count/order, settings
  round-trip, empty/absent no-op, id fallback, `</script>` escaping, static
  form, both forms together.
- Barrel regenerates on `prebuild` (`npm run build`); `docs:audit` regen, omit
  `description` (Shopify has a summary) per convention.
