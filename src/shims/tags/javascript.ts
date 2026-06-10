import type { ShimTag } from "../types";
import { assetBlock } from "./shared/asset-block";

export default {
	type: "tag",
	name: "javascript",
	status: "parity",
	implementation: assetBlock("javascript", (js) => `<script>${js}</script>`),
} satisfies ShimTag;
