import { withCache } from "~/shared/utils/cache";

import type { Resolvable, Searchable, Service } from "../types";
import TidalIcon from "./icon";
import TidalFoundIcon from "./icon-found";
import TidalNotFoundIcon from "./icon-notfound";
import { TIDAL_ALBUM_REGEX } from "./regex";
import { resolve } from "./resolve";
import { search } from "./search";

export const Tidal: Service & Searchable & Resolvable = {
	id: "tidal",
	name: "Tidal",
	regex: TIDAL_ALBUM_REGEX,
	icon: TidalIcon,
	foundIcon: TidalFoundIcon,
	notFoundIcon: TidalNotFoundIcon,
	search: withCache("tidal-search", search),
	resolve: withCache("tidal-resolve-v2", resolve),
};
