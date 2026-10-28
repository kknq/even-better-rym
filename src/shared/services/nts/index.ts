import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Service } from "../types";
import NTSIcon from "./icon";
import { NTS_RELEASE_DEFAULTS, resolve } from "./resolve";

const cachedResolve = withCache("nts-resolve", resolve);

export const NTS: Service & Resolvable = {
	id: "nts",
	name: "NTS",
	regex:
		/^https?:\/\/(?:www\.)?nts\.live\/shows\/[^/?#]+\/episodes\/[^/?#]+\/?(?:[?#].*)?$/i,
	icon: NTSIcon,
	resolve: async (url) => ({
		...(await cachedResolve(url)),
		...NTS_RELEASE_DEFAULTS,
	}),
};
