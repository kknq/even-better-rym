import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Searchable, Service } from "../types";
import AppleMusicIcon from "./icon";
import AppleMusicFoundIcon from "./icon-found";
import AppleMusicNotFoundIcon from "./icon-notfound";
import { resolve } from "./resolve";
import { search } from "./search";

export const AppleMusic: Service & Searchable & Resolvable = {
	id: "applemusic",
	name: "Apple Music",
	regex:
		/https?:\/\/music\.apple\.com\/(\w{2,4})\/(album|music-video)\/([^/]*)\/([^?]+)[^/]*/,
	icon: AppleMusicIcon,
	foundIcon: AppleMusicFoundIcon,
	notFoundIcon: AppleMusicNotFoundIcon,
	search: withCache("applemusic-search", search),
	resolve: withCache("applemusic-resolve", resolve),
};
