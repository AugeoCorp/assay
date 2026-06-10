import type { ShimTag } from "../types";
import { assetBlock } from "./shared/asset-block";

export default {
	type: "tag",
	name: "stylesheet",
	status: "parity",
	implementation: assetBlock("stylesheet", (css) => `<style>${css}</style>`),
} satisfies ShimTag;
