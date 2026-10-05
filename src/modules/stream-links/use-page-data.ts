import { useEffect, useState } from "preact/hooks";

import { SEARCHABLES } from "~/shared/services";
import type { ReleaseType, ServiceId } from "~/shared/services/types";
import {
	runScript,
	waitForDocumentReady,
	waitForElement,
} from "~/shared/utils/dom";
import type { OneShot } from "~/shared/utils/one-shot";
import {
	complete,
	failed,
	initial,
	isInitial,
	loading,
} from "~/shared/utils/one-shot";

import { getSearchArtistName } from "./metadata";
import { getReleaseTypeFromPath } from "./release-type";

export type PageDataState = OneShot<Error, PageData>;

export const usePageData = (): PageDataState => {
	const [state, setState] = useState<PageDataState>(initial);

	const fetch = async () => {
		setState(loading);

		const nextState = await getPageData()
			.then((data) => complete(data))
			.catch((error) => failed(error));

		setState(nextState);
	};

	useEffect(() => {
		if (isInitial(state)) {
			void fetch();
		}
	}, [state]);

	return state;
};

type PageData = {
	metadata: {
		artist: string;
		title: string;
		releaseType?: ReleaseType;
		serviceRegions?: StreamingPreferences["service_regions"];
	};
	links: Links;
};
async function getPageData(): Promise<PageData> {
	const [artist, title, linksData] = await Promise.all([
		getArtist(),
		getTitle(),
		getLinks(),
	]);
	return {
		metadata: {
			artist,
			title,
			releaseType: getReleaseTypeFromPath(location.pathname),
			serviceRegions: linksData.serviceRegions,
		},
		links: linksData.links,
	};
}

async function getArtist() {
	const artistElement = await waitForElement<HTMLAnchorElement>("a.artist");
	return getSearchArtistName(
		artistElement.text,
		artistElement.querySelector(".subtext")?.textContent,
	);
}

async function getTitle() {
	const titleElement = await waitForElement<HTMLMetaElement>(
		"meta[itemprop=name]",
	);
	return titleElement.content;
}

async function getLinks(): Promise<{
	links: Links;
	serviceRegions?: StreamingPreferences["service_regions"];
}> {
	await waitForDocumentReady();

	const streamingPreferences = await getStreamingPreferences();
	if (!streamingPreferences)
		return { links: EMPTY_LINKS, serviceRegions: undefined };
	const serviceRegions = streamingPreferences.service_regions ?? {};
	const normalizedPreferences = { service_regions: serviceRegions };

	const element_ = document.querySelector<HTMLElement>(
		"#media_link_button_container_top",
	);
	if (!element_)
		return {
			links: EMPTY_LINKS,
			serviceRegions,
		};

	const linksString = element_.dataset.links;
	if (!linksString)
		return {
			links: EMPTY_LINKS,
			serviceRegions,
		};

	const linksData = JSON.parse(linksString) as PageLinksData;

	const links = Object.fromEntries(
		Object.entries(linksData).map(([service, linkData]) => {
			const r = getLinkData(service, linkData, normalizedPreferences);
			if (r) {
				const link = getFullLink(service, r, normalizedPreferences);
				return [service, link];
			}

			return [service, undefined];
		}),
	);

	return {
		links: Object.fromEntries(
			SEARCHABLES.map(({ id }) => [id, links[id]]),
		) as Record<ServiceId, string | undefined>,
		serviceRegions,
	};
}

type Links = Record<ServiceId, string | undefined>;

const EMPTY_LINKS = Object.fromEntries(
	SEARCHABLES.map(({ id }) => [id, undefined]),
) as Record<ServiceId, string | undefined>;

const getStreamingPreferences = async (): Promise<
	StreamingPreferences | undefined
> => {
	const promise = new Promise<StreamingPreferences | undefined>((resolve) => {
		const listener = (e: Event) => {
			const detail = (e as CustomEvent<unknown>).detail;
			const candidate =
				detail && typeof detail === "object" && "streamingPreferences" in detail
					? (detail as { streamingPreferences?: unknown }).streamingPreferences
					: undefined;
			const streamingPreferences = isStreamingPreferences(candidate)
				? candidate
				: undefined;

			document.removeEventListener("StreamingPreferencesEvent", listener);

			resolve(streamingPreferences);
		};
		document.addEventListener("StreamingPreferencesEvent", listener);
	});

	await runScript(`
    const streamingPreferences = window.streamingPreferences;
    const __event = new CustomEvent('StreamingPreferencesEvent', { detail: { streamingPreferences } });
    document.dispatchEvent(__event);
  `);

	return promise;
};

type PageLinksData = Record<
	string,
	Record<
		string,
		LinkData & {
			default?: true;
			for?: string[];
			not?: string[];
			media_id: string;
		}
	>
>;

type StreamingPreferences = {
	service_regions?: Record<string, string>;
};
type NormalizedStreamingPreferences = {
	service_regions: Record<string, string>;
};

const isStreamingPreferences = (
	value: unknown,
): value is StreamingPreferences => {
	if (!value || typeof value !== "object") return false;

	const serviceRegions = (value as { service_regions?: unknown })
		.service_regions;
	if (serviceRegions === undefined) return true;
	if (!serviceRegions || typeof serviceRegions !== "object") return false;

	return Object.values(serviceRegions).every(
		(region) => typeof region === "string",
	);
};

function getLinkData(
	service: string,
	linkData: PageLinksData[string],
	streamingPreferences: NormalizedStreamingPreferences,
): LinkData | null {
	let bestLinkData = null;
	let bestMediaId = null;

	for (const [mediaId, index] of Object.entries(linkData)) {
		if ("default" in index && index.default) {
			bestLinkData = index;
			bestMediaId = mediaId;
		} else if (
			index.for?.includes(streamingPreferences.service_regions[service])
		) {
			index.media_id = mediaId;
			return index;
		}
	}

	if (bestLinkData) {
		if (
			bestLinkData.not?.includes(streamingPreferences.service_regions[service])
		) {
			return null;
		}

		if (bestMediaId !== null) {
			bestLinkData.media_id = bestMediaId;
		}

		return bestLinkData;
	}

	return null;
}

function getFullLink(
	service: string,
	linkData: LinkData,
	streamingPreferences: NormalizedStreamingPreferences,
) {
	switch (service) {
		case "spotify": {
			const data = linkData as SpotifyLinkData;
			return `https://open.spotify.com/${data.type}/${data.media_id}`;
		}

		case "applemusic": {
			const data = linkData as AppleMusicLinkData;
			return `https://geo.music.apple.com/${data.loc}/${
				data.album ? "album" : "video"
			}/${data.album ?? data.video}/${data.media_id}`;
		}

		case "soundcloud": {
			const data = linkData as SoundcloudLinkData;
			return `https://${data.url}`;
		}

		case "bandcamp": {
			const data = linkData as BandcampLinkData;
			return `https://${data.url}`;
		}

		case "youtube": {
			const data = linkData as YoutubeLinkData;
			return `https://www.youtube.com/watch?v=${data.media_id}`;
		}

		case "deezer": {
			const data = linkData as DeezerLinkData;
			const region = streamingPreferences.service_regions.deezer ?? "us";
			return `https://www.deezer.com/${region.toLowerCase()}/album/${data.media_id}`;
		}

		case "qobuz": {
			const data = linkData as QobuzLinkData;
			return `https://open.qobuz.com/album/${data.media_id}`;
		}

		case "tidal": {
			const data = linkData as TidalLinkData;
			return `https://tidal.com/album/${data.media_id}`;
		}

		default:
			throw new Error(`Cannot create links for service: ${service}`);
	}
}

type LinkData =
	| SpotifyLinkData
	| AppleMusicLinkData
	| SoundcloudLinkData
	| BandcampLinkData
	| YoutubeLinkData
	| DeezerLinkData
	| QobuzLinkData
	| TidalLinkData;

type SpotifyLinkData = { type: string; media_id: string };
type AppleMusicLinkData = {
	album?: string;
	video?: string;
	loc: string;
	media_id: string;
};
type SoundcloudLinkData = { url: string };
type BandcampLinkData = { url: string };
type YoutubeLinkData = { media_id: string };
type QobuzLinkData = { media_id: string };
type DeezerLinkData = { media_id: string };
type TidalLinkData = { media_id: string };
