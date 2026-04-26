import { secondsToString, stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { arrayToArtists } from "~/shared/utils/string";

import type { ReleaseAttribute, ResolveFunction } from "../types";
import type { LiveMixtapesNextData } from "./codec";

const attributes: ReleaseAttribute[] = ["downloadable", "streaming"];

const extractNextData = (document_: Document) => {
	const scriptElement = document_.querySelector("#__NEXT_DATA__");
	if (!scriptElement?.textContent) {
		throw new Error("Could not find __NEXT_DATA__ script tag");
	}

	try {
		return JSON.parse(scriptElement.textContent) as LiveMixtapesNextData;
	} catch {
		throw new Error("Failed to parse __NEXT_DATA__ JSON");
	}
};

const getArtists = (nextData: LiveMixtapesNextData) => {
	const artist = nextData?.props?.pageProps?.initialMixtape?.data?.artist;
	const djs = nextData?.props?.pageProps?.initialMixtape?.data?.djs ?? [];
	return artist ? [artist] : djs.map((dj) => dj.name);
};

const getTracks = (
	nextData: LiveMixtapesNextData,
	releaseArtists: string[],
) => {
	const tracks =
		nextData?.props?.pageProps?.initialMixtape?.included?.tracks ?? [];

	return tracks.map((track, index) => {
		const position = (index + 1).toString();

		let title =
			track.title
				.replaceAll(/\s*\(feat\.[^)]*\)/gi, "")
				.replaceAll(/\s*\[prod\.[^\]]*\]/gi, "")
				.replaceAll(/\s{2,}/g, " ")
				.trim() ?? "";

		const trackArtists = track.artist ?? "";

		if (trackArtists !== arrayToArtists(releaseArtists)) {
			title = `${trackArtists.replace(/\s*feat\..*$/i, "")} - ${title}`;
		}

		const duration = track.duration
			? secondsToString(track.duration)
			: undefined;

		return { position, title, duration };
	});
};

export const resolve: ResolveFunction = async (url) => {
	const response = await fetch({ url });
	const document_ = new DOMParser().parseFromString(response, "text/html");
	const nextData = extractNextData(document_);

	const title = nextData?.props?.pageProps?.initialMixtape?.data?.title;
	const artists = getArtists(nextData);
	const date = nextData?.props?.pageProps?.initialMixtape?.data?.release_date
		? stringToDate(nextData.props.pageProps.initialMixtape.data.release_date)
		: undefined;
	const publishDate = nextData?.props?.pageProps?.initialMixtape?.data?.uploaded
		? stringToDate(nextData.props.pageProps.initialMixtape.data.uploaded)
		: undefined;
	const tracks = getTracks(nextData, artists);
	const coverArt = nextData?.props?.pageProps?.initialMixtape?.data?.cover
		? [nextData.props.pageProps.initialMixtape.data.cover]
		: [];

	return {
		url,
		title,
		artists,
		date,
		publishDate,
		type: "mixtape",
		format: "digital file",
		attributes,
		tracks,
		coverArt,
	};
};
