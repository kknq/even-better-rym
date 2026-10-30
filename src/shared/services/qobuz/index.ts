import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Searchable, Service } from "../types";
import QobuzIcon from "./icon";
import QobuzFoundIcon from "./icon-found";
import QobuzNotFoundIcon from "./icon-notfound";
import { QOBUZ_ALBUM_REGEX } from "./regex";
import { resolve } from "./resolve";
import { search } from "./search";

export const Qobuz: Service & Searchable & Resolvable = {
	id: "qobuz",
	name: "Qobuz",
	regex: QOBUZ_ALBUM_REGEX,
	icon: QobuzIcon,
	foundIcon: QobuzFoundIcon,
	notFoundIcon: QobuzNotFoundIcon,
	search: withCache("qobuz-search", search),
	resolve: withCache("qobuz-resolve-v3", resolve),
};
