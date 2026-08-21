import { MONTH_NAMES } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType } from "~/shared/utils/music";
import { isDefined } from "~/shared/utils/types";
import type {
	DiscSize,
	ReleaseFormat,
	ReleaseType,
	ResolveData,
	ResolveFunction,
	Track,
} from "../types";

const parseMonthName = (month: string): number | undefined => {
	return MONTH_NAMES[month.toLowerCase()];
};

const normalizeOrdinalDay = (day: string): string =>
	day.replace(/(st|nd|rd|th)$/i, "");

const stringToDate = (dateString: string) => {
	const value = dateString.trim();

	const fullMatch =
		/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})$/i.exec(value);
	if (fullMatch) {
		return {
			year: Number.parseInt(fullMatch[3], 10),
			month: parseMonthName(fullMatch[1]),
			day: Number.parseInt(normalizeOrdinalDay(fullMatch[2]), 10),
		};
	}

	const monthYearMatch = /^([A-Za-z]+)\s+(\d{4})$/i.exec(value);
	if (monthYearMatch) {
		return {
			year: Number.parseInt(monthYearMatch[2], 10),
			month: parseMonthName(monthYearMatch[1]),
		};
	}

	const yearMatch = /^(\d{4})$/.exec(value);
	if (yearMatch) {
		return { year: Number.parseInt(yearMatch[1], 10) };
	}

	return undefined;
};

const getTitle = (document_: Document) => {
	const titleElement = document_.querySelector("h1.album_name");
	return titleElement?.textContent?.trim();
};

const getArtists = (document_: Document) => {
	return [...document_.querySelectorAll(".band_name a")]
		.map((element) => element.textContent?.trim())
		.filter(isDefined);
};

const getCoverArt = (document_: Document) => {
	const href = document_.querySelector<HTMLLinkElement>("#cover a")?.href;
	return href ? [href] : undefined;
};

const getDate = (document_: Document) => {
	const dateString = document_
		.querySelector("#album_info dl.float_left dd:nth-child(4)")
		?.textContent?.trim();
	return dateString ? stringToDate(dateString) : undefined;
};

const parseType = (document_: Document, data: ResolveData) => {
	const typeString = document_
		.querySelector("#album_info dl.float_left dd:nth-child(2)")
		?.textContent?.trim()
		.toLowerCase();
	switch (typeString) {
		case "full-length":
			data.type = "album";
			break;
		case "live album":
			data.type = "album";
			data.attributes = [...(data.attributes ?? []), "live"];
			break;
		case "demo":
			data.type = "bootleg";
			data.attributes = [...(data.attributes ?? []), "demo"];
			break;
		case "video":
		case "split video":
			data.type = "video";
			break;
		case "boxed set":
			data.type = "compilation";
			data.attributes = [...(data.attributes ?? []), "box set"];
			break;
		case "split": {
			const trackCount = data.tracks?.filter((track) => !track.header).length;
			data.type =
				trackCount === undefined ? undefined : getReleaseType(trackCount);
			break;
		}
		default:
			data.type = typeString as ReleaseType | undefined;
			break;
	}

	return data;
};

const parseFormat = (document_: Document, data: ResolveData) => {
	const vinylRegex =
		/^(?:(\d+)\s+)?(?:(\d+(?:\.\d+)?)"\s*)?vinyls?\b(?:\s*\(\s*(\d+(?:\s*(?:⅓|⅔|1\/3))?)\s*RPM\s*\))?$/i;
	const formatString = document_
		.querySelector("#album_info dl.float_right dd:nth-child(4)")
		?.textContent?.trim()
		.toLowerCase();
	const leadingFormat = formatString?.split("+").map((part) => part.trim())[0];
	if (/\d*\s*cd\b/i.test(leadingFormat ?? "")) {
		data.format = "cd";
	} else if (/\d*\s*dvd\b/i.test(leadingFormat ?? "")) {
		data.format = "dvd";
	} else if (/\d*\s*blu-rays?\b/i.test(leadingFormat ?? "")) {
		data.format = "blu-ray";
	} else if (vinylRegex.test(leadingFormat ?? "")) {
		data.format = "vinyl";
		const match = leadingFormat ? vinylRegex.exec(leadingFormat) : undefined;

		const discSize = match?.[2];
		switch (discSize) {
			case "16":
			case "12":
			case "11":
			case "10":
			case "9":
			case "8":
			case "7":
			case "6":
			case "5":
			case "4":
			case "3":
				data.discSize = discSize as DiscSize;
				break;
			default:
				if (discSize !== undefined) data.discSize = "non-standard";
				break;
		}

		const rpm = match?.[3];
		switch (rpm) {
			case "16⅔":
				data.attributes = [...(data.attributes ?? []), "16 rpm"];
				break;
			case "33⅓":
				data.attributes = [...(data.attributes ?? []), "33 rpm"];
				break;
			case "45":
				data.attributes = [...(data.attributes ?? []), "45 rpm"];
				break;
			case "78":
				data.attributes = [...(data.attributes ?? []), "78 rpm"];
				break;
			case "80":
				data.attributes = [...(data.attributes ?? []), "80 rpm"];
				break;
		}
	} else {
		switch (leadingFormat) {
			case "other":
				break;
			case "digital":
				data.format = "digital file";
				break;
			default:
				data.format = leadingFormat as ReleaseFormat | undefined;
				break;
		}
	}

	return data;
};

const parseDescription = (document_: Document, data: ResolveData) => {
	const coloredVinylRegex =
		/\b(?:[A-Za-z]+(?:[ /-][A-Za-z]+)*)\s+(?:colou?red\s+vinyl|vinyl)\b/i;
	const descriptionString = document_
		.querySelector("#album_info dl.float_left dd:nth-child(8)")
		?.textContent?.trim();
	const descriptionParts =
		descriptionString?.split(",").map((part) => part.trim().toLowerCase()) ??
		[];
	descriptionParts.forEach((part) => {
		if (
			/\d* colors( vinyl)?/.test(part) ||
			coloredVinylRegex.test(part) ||
			part === "coloured"
		) {
			data.attributes = [...(data.attributes ?? []), "colored vinyl"];
		} else
			switch (part) {
				case "180g":
					data.attributes = [...(data.attributes ?? []), "180 gram"];
					break;
				case "8-track cartridge":
					data.format = "8 track";
					break;
				case "bandcamp":
				case "itunes":
					data.format = "lossless digital";
					data.attributes = [
						...(data.attributes ?? []),
						"downloadable",
						"streaming",
					];
					break;
				case "box set":
				case "boxed set":
					data.attributes = [...(data.attributes ?? []), "box set"];
					break;
				case "club edition":
					data.attributes = [...(data.attributes ?? []), "fan club release"];
					break;
				case "deluxe edition":
				case "deluxe expanded edition":
					data.attributes = [...(data.attributes ?? []), "deluxe edition"];
					break;
				case "digibook":
					data.attributes = [...(data.attributes ?? []), "digibook"];
					break;
				case "digipak":
				case "digisleeve":
					data.attributes = [...(data.attributes ?? []), "digipak"];
					break;
				case "limited edition":
				case "lavish edition":
					data.attributes = [...(data.attributes ?? []), "limited edition"];
					break;
				case "limited edition boxset":
					data.attributes = [
						...(data.attributes ?? []),
						"box set",
						"limited edition",
					];
					break;
				case "gatefold":
					data.attributes = [...(data.attributes ?? []), "gatefold"];
					break;
				case "picture disc":
					data.attributes = [...(data.attributes ?? []), "picture disc"];
					break;
				case "quadraphonic":
					data.attributes = [...(data.attributes ?? []), "quadraphonic"];
					break;
				case "reel-to-reel":
					data.format = "reel-to-reel";
					break;
				case "remastered":
					data.attributes = [...(data.attributes ?? []), "remastered"];
					break;
				case "replica lp":
				case "mini-lp":
					data.attributes = [
						...(data.attributes ?? []),
						"cd sized album replica",
					];
					break;
				case "shm-cd":
					data.attributes = [...(data.attributes ?? []), "shm"];
					break;
				case "slipcase":
					data.attributes = [...(data.attributes ?? []), "slipcase/o-card"];
					break;
				case "super audio cd":
					data.format = "sacd";
					break;
			}
	});

	return data;
};

const getLabel = (document_: Document) => {
	const labelString = document_
		.querySelector("#album_info dl.float_right dd:nth-child(2)")
		?.textContent?.trim();
	const catalogIdString = document_
		.querySelector("#album_info dl.float_left dd:nth-child(6)")
		?.textContent?.trim();
	if (!labelString && !catalogIdString) return undefined;

	return {
		name: labelString,
		catno: catalogIdString,
	};
};

const getText = (element: Element) =>
	element.textContent?.replace(/\s+/g, " ").trim();

const getTracks = (document_: Document): Track[] => {
	return [
		...document_.querySelectorAll("#album_tabs_tracklist .table_lyrics tr"),
	].flatMap((row): Track[] => {
		if (
			row.classList.contains("discRow") ||
			row.classList.contains("sideRow")
		) {
			const title = getText(row);
			return title ? [{ position: "", title, header: true }] : [];
		}

		const titleCell = row.querySelector("td.wrapWords");
		if (!titleCell) return [];

		const position = getText(
			row.querySelector("td:first-child") ?? row,
		)?.replace(/\.$/, "");
		const title = getText(titleCell);
		const duration = getText(row.querySelector("td[align='right']") ?? row);

		return [{ position, title, duration }];
	});
};

export const resolve: ResolveFunction = async (url) => {
	const response = await fetch({ url });
	const document_ = new DOMParser().parseFromString(response, "text/html");

	const title = getTitle(document_);
	const artists = getArtists(document_);
	const date = getDate(document_);
	const coverArt = getCoverArt(document_);
	const label = getLabel(document_);
	const tracks = getTracks(document_);

	let data = {
		url,
		title,
		artists,
		date,
		tracks,
		coverArt,
		label,
	} as ResolveData;

	data = parseType(document_, data);
	data = parseFormat(document_, data);
	data = parseDescription(document_, data);

	return data;
};
