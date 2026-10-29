import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Searchable, Service } from "../types";
import DeezerIcon from "./icon";
import DeezerFoundIcon from "./icon-found";
import DeezerNotFoundIcon from "./icon-notfound";
import { DEEZER_ALBUM_REGEX } from "./regex";
import { resolve } from "./resolve";
import { search } from "./search";

export const Deezer: Service & Searchable & Resolvable = {
	id: "deezer",
	name: "Deezer",
	regex: DEEZER_ALBUM_REGEX,
	icon: DeezerIcon,
	foundIcon: DeezerFoundIcon,
	notFoundIcon: DeezerNotFoundIcon,
	search: withCache("deezer-search", search),
	resolve: withCache("deezer-resolve-v2", resolve),
};
