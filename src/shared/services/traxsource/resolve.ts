import { formatDuration, stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType } from "~/shared/utils/music";

import type { ResolveFunction, Track } from "../types";

const getText = (element: Element | null) => {
	const text = element?.textContent?.trim();
	return text === "" ? undefined : text;
};

const getArtists = (element: ParentNode, selector: string) =>
	[...element.querySelectorAll(selector)].flatMap((artist) => {
		const name = getText(artist);
		return name ? [name] : [];
	});

export const resolve: ResolveFunction = async (url) => {
	const response = await fetch({ url });
	const document_ = new DOMParser().parseFromString(response, "text/html");
	if (
		/^Just a moment\.{3}$/i.test(document_.title.trim()) ||
		document_.querySelector("#challenge-form, #challenge-running")
	) {
		throw new Error(
			"Traxsource returned a Cloudflare verification page instead of release details. Open the release in your browser and complete verification before retrying. Background imports may still be blocked.",
		);
	}

	const pageHead = document_.querySelector(".page-head");
	const title = getText(pageHead?.querySelector(".title") ?? null);
	if (!title) {
		throw new Error("Could not find Traxsource release details");
	}

	const releaseInfo = pageHead?.closest(".t-info") ?? pageHead;
	const artistElement = pageHead?.querySelector(".artists");
	const linkedArtists = artistElement
		? getArtists(artistElement, ".com-artists")
		: [];
	const artistText = getText(artistElement ?? null);
	const artists =
		linkedArtists.length > 0 ? linkedArtists : artistText ? [artistText] : [];
	const trackList = document_.querySelector("#trkListCont") ?? document_;
	const tracks: Track[] = [...trackList.querySelectorAll(".trk-row")].flatMap(
		(row): Track[] => {
			let title = getText(row.querySelector(".trk-cell.title a"));
			if (!title) return [];

			const versionText = getText(
				row.querySelector(".trk-cell.title .version"),
			);
			const version = versionText
				?.replace(/\s*\(\d+(?::\d+){1,2}\)\s*$/, "")
				.trim();
			if (
				version &&
				version.toLowerCase() !== "original mix" &&
				!title.includes(version)
			) {
				title += ` (${version})`;
			}

			const trackArtists = getArtists(row, ".trk-cell.artists .com-artists");
			if (
				trackArtists.length > 0 &&
				!trackArtists.some((artist) => artists.includes(artist))
			) {
				title = `${trackArtists.join(", ")} - ${title}`;
			}

			const duration = (
				getText(row.querySelector(".duration")) ??
				versionText?.match(/\((\d+(?::\d+){1,2})\)\s*$/)?.[1]
			)
				?.replace(/[()]/g, "")
				.trim();

			return [
				{
					position: getText(row.querySelector(".tnum")),
					title,
					duration: duration ? formatDuration(duration) : undefined,
				},
			];
		},
	);

	const catalogDate = getText(releaseInfo?.querySelector(".cat-rdate") ?? null)
		?.split("|")
		.map((part) => part.trim());
	const dateText =
		catalogDate?.find((part) => /^\d{4}-\d{2}-\d{2}$/.test(part)) ??
		getText(document_.querySelector(".bsd-detail-release-date, .release-date"));
	if (dateText && Number.isNaN(Date.parse(dateText))) {
		throw new Error("Could not parse Traxsource release date");
	}
	const image = document_
		.querySelector('meta[property="og:image"]')
		?.getAttribute("content");

	return {
		url,
		title,
		artists,
		date: dateText ? stringToDate(dateText) : undefined,
		tracks,
		type: getReleaseType(title, tracks.length),
		format: "lossless digital",
		attributes: ["downloadable"],
		label: {
			name: getText(pageHead?.querySelector(".com-label") ?? null),
			catno: catalogDate && catalogDate.length > 1 ? catalogDate[0] : undefined,
		},
		coverArt: image ? [new URL(image, url).href] : [],
	};
};
