import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Service } from "../types";
import TraxsourceIcon from "./icon";
import { resolve } from "./resolve";

export const Traxsource: Service & Resolvable = {
	id: "traxsource",
	name: "Traxsource",
	regex: /^https?:\/\/(?:www\.)?traxsource\.com\/title\/\d+(?:[/?#]|$)/i,
	icon: TraxsourceIcon,
	resolve: withCache("traxsource-resolve", resolve),
};
