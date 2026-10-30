import { secondsToString, stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType, withVersion } from "~/shared/utils/music";

import type { ReleaseType, ResolveFunction, Track } from "../types";
import { requestToken } from "./auth";
import { TIDAL_ALBUM_REGEX } from "./regex";

type Identifier = {
	id: string;
	type: string;
	meta?: { trackNumber: number; volumeNumber: number };
};
type Relationship = {
	data?: Identifier[];
	links?: { next?: string };
};
type Resource = Identifier & {
	attributes: {
		title?: string;
		name?: string;
		version?: string;
		duration?: string;
		releaseDate?: string;
		albumType?: string;
		type?: string;
		numberOfItems?: number;
		numberOfVolumes?: number;
		mediaTags?: string[];
		files?: { href: string; meta?: { width: number; height: number } }[];
	};
	relationships?: Record<string, Relationship>;
};
type Document = {
	data: Resource | Identifier[];
	included?: Resource[];
	links?: { next?: string };
	errors?: { detail?: string; title?: string }[];
};

const releaseTypes: Readonly<Record<string, ReleaseType>> = {
	ALBUM: "album",
	EP: "ep",
	SINGLE: "single",
};

function duration(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
	if (!match?.slice(1).some(Boolean)) {
		throw new Error("Could not parse Tidal track duration");
	}
	return secondsToString(
		Number(match[1] ?? 0) * 3600 +
			Number(match[2] ?? 0) * 60 +
			Number(match[3] ?? 0),
	);
}

export const resolve: ResolveFunction = async (url) => {
	const match = TIDAL_ALBUM_REGEX.exec(url);
	if (!match) throw new Error("Unsupported Tidal album URL");
	const id = match[1];
	const { access_token } = await requestToken();
	const request = async (url: string, include?: string) => {
		const data = JSON.parse(
			await fetch({
				url,
				headers: {
					Authorization: `Bearer ${access_token}`,
					Accept: "application/vnd.api+json",
				},
				urlParameters: {
					countryCode: "US",
					...(include ? { include } : {}),
				},
			}),
		) as Document;
		if (data.errors?.length) {
			throw new Error(
				`Tidal import failed: ${data.errors
					.map((error) => error.detail ?? error.title ?? "Unknown error")
					.join("; ")}`,
			);
		}
		return data;
	};
	const document = await request(
		`https://openapi.tidal.com/v2/albums/${id}`,
		"artists,coverArt",
	);
	if (Array.isArray(document.data) || !document.data?.attributes?.title) {
		throw new Error("Could not find Tidal album details");
	}
	const album = document.data;
	const included = new Map<string, Resource>();
	const addIncluded = (data: Document) => {
		for (const resource of data.included ?? []) {
			included.set(`${resource.type}:${resource.id}`, resource);
		}
	};
	addIncluded(document);
	const getResource = (identifier: Identifier): Resource => {
		const resource = included.get(`${identifier.type}:${identifier.id}`);
		if (!resource) {
			throw new Error(`Missing Tidal ${identifier.type} ${identifier.id}`);
		}
		return resource;
	};
	const getArtists = (resource: Resource) =>
		(resource.relationships?.artists?.data ?? []).map((artist) => {
			const name = getResource(artist).attributes.name;
			if (!name) throw new Error("Could not parse Tidal artist name");
			return name;
		});
	const artists = getArtists(album);
	if (artists.length === 0)
		throw new Error("Could not find Tidal album artists");
	const items: Identifier[] = [];
	let next: string | undefined =
		`https://openapi.tidal.com/v2/albums/${id}/relationships/items`;
	const visited = new Set<string>();
	while (next) {
		const pageUrl = new URL(
			next.startsWith("/albums/") ? `/v2${next}` : next,
			"https://openapi.tidal.com/v2/",
		);
		if (
			pageUrl.origin !== "https://openapi.tidal.com" ||
			pageUrl.pathname !== `/v2/albums/${id}/relationships/items` ||
			visited.has(pageUrl.href)
		) {
			throw new Error("Invalid Tidal track pagination");
		}
		visited.add(pageUrl.href);
		const page = await request(pageUrl.href, "items.artists");
		if (!Array.isArray(page.data)) {
			throw new Error("Could not parse Tidal album tracklist");
		}
		items.push(...page.data);
		addIncluded(page);
		next = page.links?.next;
	}
	if (
		items.length === 0 ||
		(album.attributes.numberOfItems !== undefined &&
			items.length !== album.attributes.numberOfItems)
	) {
		throw new Error("Tidal returned an incomplete tracklist");
	}
	const tracks: Track[] = items.map((item, index) => {
		const track = getResource(item);
		if (!track.attributes.title) {
			throw new Error(`Could not parse Tidal track ${index + 1}`);
		}
		let title = withVersion(track.attributes.title, track.attributes.version);
		const trackArtists = getArtists(track);
		if (
			trackArtists.length > 0 &&
			!trackArtists.some((artist) => artists.includes(artist))
		) {
			title = `${trackArtists.join(", ")} - ${title}`;
		}
		const position =
			(album.attributes.numberOfVolumes ?? 1) > 1 && item.meta
				? `${item.meta.volumeNumber}.${item.meta.trackNumber}`
				: String(item.meta?.trackNumber ?? index + 1);
		return { position, title, duration: duration(track.attributes.duration) };
	});
	const artworkFiles = (album.relationships?.coverArt?.data ?? []).flatMap(
		(artwork) => getResource(artwork).attributes.files ?? [],
	);
	artworkFiles.sort(
		(a, b) =>
			(b.meta?.width ?? 0) * (b.meta?.height ?? 0) -
			(a.meta?.width ?? 0) * (a.meta?.height ?? 0),
	);
	const dateText = album.attributes.releaseDate;
	if (dateText && Number.isNaN(Date.parse(dateText))) {
		throw new Error("Could not parse Tidal release date");
	}
	return {
		url: `https://tidal.com/browse/album/${id}`,
		title: withVersion(album.attributes.title ?? "", album.attributes.version),
		artists,
		date: dateText ? stringToDate(dateText) : undefined,
		type:
			releaseTypes[album.attributes.albumType ?? album.attributes.type ?? ""] ??
			getReleaseType(album.attributes.title, tracks.length),
		format: album.attributes.mediaTags?.some((tag) => tag.includes("LOSSLESS"))
			? "lossless digital"
			: "digital file",
		attributes: ["streaming"],
		tracks,
		coverArt: artworkFiles[0] ? [artworkFiles[0].href] : undefined,
	};
};
