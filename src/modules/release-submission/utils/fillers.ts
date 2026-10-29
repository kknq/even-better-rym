import type {
	DiscSize,
	ReleaseAttribute,
	ReleaseDate,
	ReleaseFormat,
	ReleaseLabel,
	ReleaseType,
	ResolveData,
	Track,
} from "~/shared/services/types";
import { forceQuerySelector } from "~/shared/utils/dom";

import type { FillData } from "../dom";
import type { CapitalizationType } from "./capitalization";
import { capitalize } from "./capitalization";
import {
	clearFiledUnderEntries,
	switchAwayFromSameAsParent,
} from "./filed-under";
import { goInfobox } from "./page-functions";
import { editAdvancedTracklist } from "./simple-tracklist";
import { formatTracks, getTrackDurations } from "./tracklist";

export async function fillArtists(
	artists: string[],
	mode: ResolveData["artistMode"] = "search",
) {
	if (mode === "text" && artists.length > 0) {
		forceQuerySelector<HTMLInputElement>(document)(
			"#filed_under_searchterm",
		).value = artists.join(", ");
		dispatchReleaseArtists([]);
		return;
	}

	const isVariousArtists = artists[0]?.toLowerCase() === "various artists";
	if (isVariousArtists) {
		forceQuerySelector<HTMLInputElement>(document)("#cat_va").click();
		switchAwayFromSameAsParent();
		await clearFiledUnderEntries();
	}
	dispatchReleaseArtists(isVariousArtists ? [] : artists);
}

function dispatchReleaseArtists(artists: string[]) {
	document.dispatchEvent(
		new CustomEvent<string[]>("releaseArtistsEvent", { detail: artists }),
	);
}

export function fillType(type: ReleaseType) {
	const element = forceQuerySelector<HTMLInputElement>(document)(
		`input#category${TYPE_IDS[type]}`,
	);
	element.click(); // click to trigger DOM onClick events (e.g. field updates on 'music video' click)
	element.checked = true; // ensure that element is checked
}

export function fillDate(date: ReleaseDate) {
	if (date.year !== undefined) fillYear(date.year);
	if (date.month !== undefined) fillMonth(date.month);
	if (date.day !== undefined) fillDay(date.day);

	const fillEvent = new CustomEvent<FillData>("fillEvent", {
		detail: { filledField: "date" },
	});
	document.dispatchEvent(fillEvent);
}

function fillYear(year: number) {
	forceQuerySelector<HTMLSelectElement>(document)("#year").value =
		year.toString();
}

function fillMonth(month: number) {
	forceQuerySelector<HTMLSelectElement>(document)("#month").value = month
		.toString()
		.padStart(2, "0");
}

function fillDay(day: number) {
	forceQuerySelector<HTMLSelectElement>(document)("#day").value = day
		.toString()
		.padStart(2, "0");
}

export function fillTitle(title: string, capitalization: CapitalizationType) {
	forceQuerySelector<HTMLInputElement>(document)("#title").value = capitalize(
		title,
		capitalization,
	);
}

export function fillFormat(format: ReleaseFormat) {
	forceQuerySelector<HTMLInputElement>(document)(
		`#format${FORMAT_IDS[format]}`,
	).checked = true;
}

export function fillDiscSize(discSize: DiscSize) {
	forceQuerySelector<HTMLInputElement>(document)(
		`#disc_size${DISC_SIZE_IDS[discSize]}`,
	).checked = true;
}

export async function fillLabel(label: ReleaseLabel) {
	if (label.id !== undefined) {
		await goInfobox(label.id);
	} else {
		forceQuerySelector<HTMLInputElement>(document)(
			"#label~table #searchterm",
		).value = label.name ?? "";

		if (label.name)
			forceQuerySelector<HTMLInputElement>(document)(
				"#label~table .gosearch .btn",
			).click();
	}

	forceQuerySelector<HTMLInputElement>(document)("#catalog_no").value =
		label.catno ?? "";
}

export function fillAttributes(attributes: ReleaseAttribute[]) {
	for (const attribute of attributes) fillAttribute(attribute);
}

function fillAttribute(attribute: ReleaseAttribute) {
	forceQuerySelector<HTMLInputElement>(document)(
		`#attrib${ATTRIBUTE_IDS[attribute]}`,
	).checked = true;
}

export async function fillTracks(
	tracks: Track[],
	capitalization: CapitalizationType,
	preserveTrackLengths: boolean,
) {
	await editAdvancedTracklist((text) => {
		const existingDurations = preserveTrackLengths
			? getTrackDurations(text)
			: undefined;
		return formatTracks(tracks, capitalization, existingDurations);
	});
}

export function fillSource(url: string) {
	forceQuerySelector<HTMLTextAreaElement>(document)("#notes").value = url;
}

export function fillCountries(countries: string[]) {
	forceQuerySelector<HTMLTextAreaElement>(document)("#countries").value =
		countries.join(", ");
}

export function fillClassifiers(classifiers: string[]) {
	const input =
		forceQuerySelector<HTMLInputElement>(document)("#va_classifiers");
	for (const classifier of classifiers) {
		if (!input.value.includes(classifier)) {
			input.value = [input.value.trim(), classifier].filter(Boolean).join(" ");
		}
	}
}

const TYPE_IDS: Record<ReleaseType, string> = {
	album: "s",
	compilation: "t",
	ep: "e",
	single: "i",
	mixtape: "m",
	"music video": "o",
	"dj mix": "j",
	bootleg: "b",
	video: "d",
	"additional releases": "x",
};

const FORMAT_IDS: Record<ReleaseFormat, number> = {
	"digital file": 58,
	"lossless digital": 59,
	"blu-ray": 88,
	cd: 60,
	"cd-r": 32,
	dualdisc: 54,
	dvd: 78,
	"dvd-a": 77,
	"dvd-r": 100,
	hdad: 62,
	hdcd: 83,
	laserdisc: 89,
	minidisc: 48,
	sacd: 76,
	umd: 81,
	vcd: 79,
	vinyl: 95,
	shellac: 96,
	"8 track": 21,
	"4 track": 103,
	acetate: 80,
	beta: 41,
	cassette: 66,
	dat: 104,
	dcc: 105,
	microcasette: 101,
	playtape: 102,
	"reel-to-reel": 92,
	vhs: 40,
	"phonograph cylinder": 91,
};

const DISC_SIZE_IDS: Record<DiscSize, number> = {
	"16": 93,
	"12": 88,
	"11": 94,
	"10": 89,
	"9": 95,
	"8": 96,
	"7": 90,
	"6": 97,
	"5": 91,
	"4": 98,
	"3": 92,
	"non-standard": 99,
};

const ATTRIBUTE_IDS: Record<ReleaseAttribute, number> = {
	abridged: 37,
	"bonus cd": 50,
	"bonus dvd": 51,
	"bonus flash drive": 82,
	"bonus tracks": 62,
	censored: 47,
	"content/copy protected": 61,
	"digital download": 101,
	"duophonic/electronically rechanneled stereo": 102,
	"enhanced cd": 63,
	mono: 75,
	quadraphonic: 103,
	remastered: 23,
	"re-recorded": 29,
	"single-sided": 104,
	"anniversary edition": 120,
	"box set": 12,
	"collector's edition": 49,
	"deluxe edition": 59,
	demo: 129,
	"promotional demo": 18,
	exclusive: 72,
	"fan club release": 38,
	"limited edition": 16,
	"numbered edition": 73,
	promo: 11,
	"unauthorized mixtape/dj mix": 100,
	"amaray case": 67,
	"cd sized album replica": 60,
	digibook: 109,
	digipak: 21,
	gatefold: 30,
	handmade: 33,
	"jewel case": 76,
	"musicpac/slidepac": 110,
	"no artwork": 83,
	"paper/cardboard sleeve": 81,
	"slipcase/o-card": 111,
	"usb/flash drive": 80,
	"colored vinyl": 32,
	etched: 105,
	"flexi-disc": 66,
	"multi-groove": 106,
	"picture disc": 31,
	"test pressing": 108,
	"white label": 107,
	"120 gram": 43,
	"140 gram": 115,
	"150 gram": 116,
	"160 gram": 117,
	"180 gram": 44,
	"200 gram": 118,
	"220 gram": 119,
	"16 rpm": 40,
	"33 rpm": 19,
	"45 rpm": 41,
	"78 rpm": 42,
	"80 rpm": 112,
	"3 3/4 ips": 113,
	"7 1/2 ips": 114,
	"gold disc": 52,
	shm: 86,
	downloadable: 122,
	streaming: 123,
	remixes: 24,
	"selector comp": 10,
	archival: 7,
	"creative commons": 78,
	interview: 14,
	live: 5,
	"nsbm/nazi material": 77,
	"cast recording": 57,
	"film score": 53,
	"motion picture soundtrack": 54,
	"songs inspired by": 69,
	"television soundtrack": 55,
	"video game soundtrack": 56,
};
