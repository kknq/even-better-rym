import { withCache } from "~/shared/utils/cache";

import type { Embeddable, Resolvable, Searchable, Service } from "../types";
import { embed } from "./embed";
import BandcampIcon from "./icon";
import BandcampFoundIcon from "./icon-found";
import BandcampNotFoundIcon from "./icon-notfound";
import { resolve } from "./resolve";
import { search } from "./search";

export const Bandcamp: Service & Searchable & Resolvable & Embeddable = {
	id: "bandcamp",
	name: "Bandcamp",
	regex: /https?:\/\/.*\.bandcamp\.com\/(track|album)\/.*/,
	icon: BandcampIcon,
	foundIcon: BandcampFoundIcon,
	notFoundIcon: BandcampNotFoundIcon,
	search: withCache("bandcamp-search", search),
	resolve: withCache("bandcamp-resolve", resolve),
	embed: withCache("bandcamp-embed", embed),
};
