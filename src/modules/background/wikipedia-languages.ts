import { normalizeSearchText } from "~/shared/services/search-matching";
import type { FetchRequest } from "~/shared/utils/messaging";
import { backgroundFetch } from "./fetch";

type Entity = {
	labels?: Record<string, { value: string }>;
	aliases?: Record<string, { value: string }[]>;
	claims?: Record<
		string,
		{ mainsnak: { datavalue?: { value?: { id?: string } } } }[]
	>;
	sitelinks?: Record<string, { title: string; url: string }>;
};

const normalize = (value: string) =>
	normalizeSearchText(value).replace(/[^\p{L}\p{N}]/gu, "");

const hasName = (
	entity: Entity,
	name: string,
	allowDisambiguation = false,
): boolean =>
	[
		...Object.values(entity.labels ?? {}),
		...Object.values(entity.aliases ?? {}).flat(),
	].some(
		(label) =>
			normalize(label.value) === normalize(name) ||
			(allowDisambiguation &&
				normalize(
					label.value.normalize("NFKC").replace(/\s*\([^()]+\)$/, ""),
				) === normalize(name)),
	);

export const findOtherLanguageArticle = async (
	id: string,
	albumTitle: string,
	artistName: string,
): Promise<string | undefined> => {
	const request = async <T>(
		urlParameters: NonNullable<FetchRequest["data"]["urlParameters"]>,
	): Promise<T> => {
		const response = await backgroundFetch({
			id,
			type: "fetch",
			data: {
				url: "https://www.wikidata.org/w/api.php",
				urlParameters: { format: "json", origin: "*", ...urlParameters },
				headers: { Accept: "application/json" },
			},
		});
		if (response.data.error) throw new Error(response.data.error);
		if (response.data.status < 200 || response.data.status >= 300)
			throw new Error("Multilingual Wikipedia search failed.");
		const result = JSON.parse(response.data.body) as T & {
			error?: { info?: string };
		};
		if (result.error)
			throw new Error(result.error.info ?? "Wikidata search failed.");
		return result;
	};
	const results = await request<{ query?: { search?: { title: string }[] } }>({
		action: "query",
		list: "search",
		srsearch: `${albumTitle} haswbstatement:P175`,
		srnamespace: "0",
		srlimit: "50",
	});
	const ids = results.query?.search?.map((result) => result.title) ?? [];
	if (!ids.length) return undefined;
	const { entities } = await request<{ entities: Record<string, Entity> }>({
		action: "wbgetentities",
		ids: ids.join("|"),
		props: "labels|aliases|claims|sitelinks/urls",
	});
	const candidates = ids
		.map((entityId) => entities[entityId])
		.filter((entity) => entity && hasName(entity, albumTitle, true));
	const artistIds = [
		...new Set(
			candidates.flatMap((entity) =>
				(entity.claims?.P175 ?? []).flatMap((claim) => {
					const artistId = claim.mainsnak.datavalue?.value?.id;
					return artistId ? [artistId] : [];
				}),
			),
		),
	];
	if (!artistIds.length) return undefined;
	const artists = await request<{ entities: Record<string, Entity> }>({
		action: "wbgetentities",
		ids: artistIds.join("|"),
		props: "labels|aliases",
	});
	for (const entity of candidates) {
		const matchesArtist = (entity.claims?.P175 ?? []).some((claim) => {
			const artistId = claim.mainsnak.datavalue?.value?.id;
			const artist = artistId ? artists.entities[artistId] : undefined;
			return artist && hasName(artist, artistName);
		});
		if (!matchesArtist) continue;
		for (const [site, link] of Object.entries(entity.sitelinks ?? {}).sort(
			([a], [b]) => a.localeCompare(b),
		)) {
			if (!site.endsWith("wiki") || site === "enwiki") continue;
			const url = new URL(link.url);
			if (
				url.protocol === "https:" &&
				url.hostname !== "en.wikipedia.org" &&
				/^[a-z][a-z0-9-]*\.wikipedia\.org$/.test(url.hostname) &&
				url.pathname.startsWith("/wiki/")
			)
				return url.href;
		}
	}
	return undefined;
};
