import { asArray } from "~/shared/utils/array";
import { formatDuration, stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType } from "~/shared/utils/music";
import { isDefined } from "~/shared/utils/types";

import type { ReleaseAttribute, ResolveFunction } from "../types";
import type { ReleaseData } from "./codec";
import { QOBUZ_ALBUM_REGEX } from "./regex";

const attributes: ReleaseAttribute[] = ["downloadable", "streaming"];

const getArtists = (document_: Document) => {
	return [...document_.querySelectorAll("li.album-meta__item")]
		.filter((li) => li.textContent.includes("Main artists:"))
		.flatMap((li) => [...li.querySelectorAll("a")])
		.map((element) => element.getAttribute("title")?.trim())
		.filter(isDefined);
};

const getCoverArt = (document_: Document) => {
	const url =
		document_.querySelector<HTMLImageElement>("img.album-cover__image")?.src ??
		undefined;

	if (!url) return undefined;

	return url.replace("_600.jpg", "_max.jpg");
};

const getLabel = (document_: Document) => {
	return [...document_.querySelectorAll("li.album-about__item")]
		.find((li) => li.textContent.includes("Label"))
		?.querySelector("a")
		?.textContent?.trim();
};

const getReleaseData = (document_: Document) => {
	const findAlbum = (value: unknown): ReleaseData | undefined => {
		if (Array.isArray(value)) {
			return value.map(findAlbum).find(isDefined);
		}
		if (typeof value !== "object" || value === null) return undefined;
		if ("@type" in value && value["@type"] === "MusicAlbum") {
			if (!("name" in value) || typeof value.name !== "string") {
				throw new Error("Could not parse Qobuz album title");
			}
			return value as ReleaseData;
		}
		if ("@graph" in value) return findAlbum(value["@graph"]);
		return undefined;
	};
	for (const script of document_.querySelectorAll<HTMLScriptElement>(
		'script[type="application/ld+json"]',
	)) {
		const album = findAlbum(JSON.parse(script.text) as unknown);
		if (album) return album;
	}

	throw new Error("Could not find Qobuz album details");
};

const getTracks = (document_: Document) => {
	return [...document_.querySelectorAll("#playerTracks div.track__items")].map(
		(element, index) => {
			const position = element
				.querySelector("div.track__item--number")
				?.textContent?.trim();
			const title = element.getAttribute("title")?.trim();
			const durationText = element
				.querySelector("span.track__item--duration")
				?.textContent?.trim();
			const duration = durationText ? formatDuration(durationText) : undefined;
			if (!title) {
				throw new Error(`Could not parse Qobuz track ${index + 1}`);
			}
			return { position, title, duration };
		},
	);
};

export const resolve: ResolveFunction = async (url) => {
	const match = QOBUZ_ALBUM_REGEX.exec(url);
	if (!match) throw new Error("Unsupported Qobuz album URL");
	const usUrl = match[2]
		? `https://www.qobuz.com/us-en/album/-/${match[2]}`
		: url
				.replace(/^http:/, "https:")
				.replace(/(?<=qobuz\.com\/)[a-z]{2}-[a-z]{2}/i, "us-en")
				.split(/[?#]/)[0];
	const response = await fetch({ url: usUrl });
	const document_ = new DOMParser().parseFromString(response, "text/html");
	const releaseData = getReleaseData(document_);

	const title = releaseData.name;
	const artists = getArtists(document_);
	const date = releaseData.datePublished
		? stringToDate(releaseData.datePublished)
		: undefined;
	const tracks = getTracks(document_);
	if (!title.trim() || artists.length === 0 || tracks.length === 0) {
		throw new Error("Qobuz returned incomplete album details");
	}
	if (
		releaseData.datePublished &&
		Number.isNaN(Date.parse(releaseData.datePublished))
	) {
		throw new Error("Could not parse Qobuz release date");
	}
	const type = getReleaseType(title, tracks.length);
	const coverArt = asArray(getCoverArt(document_));
	const labelName = getLabel(document_);

	const label = labelName ? { name: labelName } : undefined;

	return {
		url: usUrl,
		title,
		artists,
		date,
		type,
		format: "lossless digital",
		attributes,
		tracks,
		coverArt,
		label,
	};
};
