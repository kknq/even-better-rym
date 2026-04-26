import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Service } from "../types";
import LiveMixtapesIcon from "./icon";
import { resolve } from "./resolve";

export const LiveMixtapes: Service & Resolvable = {
	id: "livemixtapes",
	name: "LiveMixtapes",
	regex: /https?:\/\/.*\.?livemixtapes\.com\/mixtape\/.*/,
	icon: LiveMixtapesIcon,
	resolve: withCache("livemixtapes-resolve", resolve),
};
