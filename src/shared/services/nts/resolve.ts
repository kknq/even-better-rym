import { MONTHS } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";

import type {
	ReleaseDate,
	ResolveData,
	ResolveFunction,
	Track,
} from "../types";

export const NTS_RELEASE_DEFAULTS = {
	classifiers: ["[Descriptor60311]"],
	label: { id: 897, name: "(No Label)", catno: "n/a" },
	filedUnderCreditRole: "DJ mixing",
} satisfies ResolveData;

const getText = (element: Element | null) => {
	const text = element?.textContent?.trim();
	return text === "" ? undefined : text;
};

function parseDate(value: string): ReleaseDate {
	const match = /^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i.exec(value);
	const day = Number(match?.[1]);
	const month = MONTHS.findIndex(
		(month) => month.slice(0, 3).toLowerCase() === match?.[2].toLowerCase(),
	);
	const year = Number(match?.[3]);
	const date = new Date(Date.UTC(year, month, day));
	if (
		month < 0 ||
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month ||
		date.getUTCDate() !== day
	) {
		throw new Error("Could not parse NTS broadcast date");
	}
	return { year, month: month + 1, day };
}

export const resolve: ResolveFunction = async (url) => {
	const response = await fetch({ url });
	const document_ = new DOMParser().parseFromString(response, "text/html");
	const heading = getText(document_.querySelector(".episode__heading"));
	if (!heading) {
		throw new Error("Could not find NTS episode details");
	}

	const hostMatch = /^(.*?)\s+w\/\s+(.+)$/i.exec(heading);
	const title = hostMatch?.[1] ?? heading;
	const artists = hostMatch
		? [hostMatch[2]]
		: [
				...document_.querySelectorAll(".episode__header .bio__artist-link__a"),
			].flatMap((element) => {
				const name = getText(element);
				return name ? [name] : [];
			});
	const dateText = getText(document_.querySelector(".bio__broadcast-date"));
	const date = dateText ? parseDate(dateText) : undefined;

	const tracks: Track[] = [
		...document_.querySelectorAll(".tracklist__tracks .track"),
	].map((row, index) => {
		const title = getText(row.querySelector(".track__title"));
		if (!title) {
			throw new Error(`Could not find NTS track ${index + 1} title`);
		}
		const artistElement = row.querySelector(".track__artists")?.cloneNode(true);
		let artist: string | undefined;
		if (artistElement instanceof Element) {
			for (const duplicate of artistElement.querySelectorAll(
				".track__artist--mobile",
			)) {
				duplicate.remove();
			}
			artist = getText(artistElement);
		}
		return {
			position: String(index + 1),
			title: artist ? `${artist} - ${title}` : title,
		};
	});

	const image = document_
		.querySelector('meta[property="og:image"]')
		?.getAttribute("content");
	let coverArt: string[] | undefined;
	if (image) {
		const imageUrl = new URL(image, url);
		if (
			/^(?:media\d*\.)ntslive\.co\.uk$/i.test(imageUrl.hostname) &&
			/^\/resize\/\d+x\d+\//.test(imageUrl.pathname)
		) {
			// NTS caps oversized resize requests at the original image dimensions.
			imageUrl.pathname = imageUrl.pathname.replace(
				/^\/resize\/\d+x\d+\//,
				"/resize/10000x10000/",
			);
		}
		coverArt = [imageUrl.href];
	}

	return {
		url,
		title,
		artists: artists.length > 0 ? artists : [heading],
		artistMode: "text",
		date,
		type: "dj mix",
		format: "digital file",
		attributes: ["streaming"],
		...NTS_RELEASE_DEFAULTS,
		tracks,
		coverArt,
	};
};
