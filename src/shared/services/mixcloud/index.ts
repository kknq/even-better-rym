import { withCache } from "~/shared/utils/cache";

import { DJ_MIX_RELEASE_DEFAULTS } from "../dj-mix";
import type { Resolvable, Service } from "../types";
import MixcloudIcon from "./icon";
import { MIXCLOUD_REGEX } from "./regex";
import { resolve } from "./resolve";

const cachedResolve = withCache("mixcloud-resolve-v2", resolve);

export const Mixcloud: Service & Resolvable = {
	id: "mixcloud",
	name: "Mixcloud",
	regex: MIXCLOUD_REGEX,
	icon: MixcloudIcon,
	resolve: async (url) => ({
		...(await cachedResolve(url)),
		...DJ_MIX_RELEASE_DEFAULTS,
	}),
};
