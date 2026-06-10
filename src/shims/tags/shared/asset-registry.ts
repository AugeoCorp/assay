/**
 * Per-page registry backing the `{% stylesheet %}` / `{% javascript %}` shims.
 *
 * Shopify emits each section/block/snippet asset at most once per page, no
 * matter how many times the owning template renders. LiquidJS has no page-level
 * store that survives `{% render %}` (each spawns a fresh `Context` with empty
 * registers), so dedup lives here at module scope and is reset once per page by
 * `render()`. Tests render sequentially, so a shared module-level set is safe.
 */

const seen = new Set<string>();

/**
 * Clears the registry. `render()` calls this at the start of every page render
 * so asset dedup is scoped to a single page, matching Shopify.
 */
export function resetAssetRegistry(): void {
	seen.clear();
}

/**
 * Records `key` and reports whether this is its first sighting this page —
 * `true` the first time, `false` thereafter.
 */
export function firstSeen(key: string): boolean {
	if (seen.has(key)) return false;
	seen.add(key);
	return true;
}
