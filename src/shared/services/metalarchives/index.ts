import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Service } from "../types";
import MetalAchivesIcon from "./icon";
import { resolve } from "./resolve";

export const MetalArchives: Service & Resolvable = {
	id: "metal-archives",
	name: "The Metal Archives",
	regex: /https?:\/\/.*\.?metal-archives\.com\/albums\/.*\/.*\/\d*/,
	icon: MetalAchivesIcon,
	resolve: withCache("metal-archives-resolve", resolve),
};
