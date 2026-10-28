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
import {
	forceQuerySelector,
	runScript,
	waitForResult,
} from "~/shared/utils/dom";

import type { FillData } from "../dom";
import type { CapitalizationType } from "./capitalization";
import { capitalize } from "./capitalization";
import { fillFiledUnderCredits } from "./credits";
import { goInfobox } from "./page-functions";
import { formatTracks, getTrackDurations } from "./tracklist";
import type { ReleaseOptions } from "./types";

export async function fill(
	data: ResolveData,
	options: ReleaseOptions,
): Promise<void> {
	const { fillFields, capitalization, preserveTrackLengths } = options;
	const {
		artists,
		type,
		date,
		title,
		format,
		discSize,
		label,
		attributes,
		tracks,
		url,
		countries,
		classifiers,
		filedUnderCreditRole,
	} = data;
	const steps: (() => unknown)[] = [];
	if (artists != null && fillFields.artists)
		steps.push(() => fillArtists(artists, data.artistMode));
	if (type != null && fillFields.type) steps.push(() => fillType(type));
	if (date != null && fillFields.date) steps.push(() => fillDate(date));
	if (title != null && fillFields.title)
		steps.push(() => fillTitle(title, capitalization));
	if (format != null && fillFields.format) steps.push(() => fillFormat(format));
	if (discSize != null && fillFields.discSize)
		steps.push(() => fillDiscSize(discSize));
	if (label != null && fillFields.label) steps.push(() => fillLabel(label));
	if (attributes != null && fillFields.attributes)
		steps.push(() => fillAttributes(attributes));
	if (tracks != null && fillFields.tracks)
		steps.push(() => fillTracks(tracks, capitalization, preserveTrackLengths));
	if (url !== undefined) steps.push(() => fillSource(url));
	if (countries != null && fillFields.countries)
		steps.push(() => fillCountries(countries));
	if (classifiers != null) steps.push(() => fillClassifiers(classifiers));
	if (filedUnderCreditRole != null && fillFields.credits)
		steps.push(() => fillFiledUnderCredits(filedUnderCreditRole));

	// Run every step even if an earlier one fails, so one missing field
	// doesn't prevent the rest of the release from being filled.
	const errors: unknown[] = [];
	for (const step of steps) {
		try {
			await step();
		} catch (error) {
			errors.push(error);
		}
	}
	if (errors.length === 1) throw errors[0];
	if (errors.length > 1) throw new AggregateError(errors, "Import failed");
}

async function fillArtists(
	artists: string[],
	mode: ResolveData["artistMode"] = "search",
) {
	if (mode === "text") {
		forceQuerySelector<HTMLInputElement>(document)(
			"#filed_under_searchterm",
		).value = artists.join(", ");
		return;
	}
	if (artists[0]?.toLowerCase() === "various artists") {
		// Various Artists release
		forceQuerySelector<HTMLInputElement>(document)("#cat_va").click();
	} else {
		// Regular release
		if (document.querySelector(".sortable_filed_under_performer") !== null)
			return;

		for (const artist of artists) await fillArtist(artist);
	}
}

async function fillArtist(artist: string) {
	// Enter search term
	forceQuerySelector<HTMLInputElement>(document)(
		"#filed_under_searchterm",
	).value = artist;

	// Click search button
	forceQuerySelector<HTMLInputElement>(document)(
		"#section_filed_under .gosearch input[type=button]",
	).click();

	// Wait for results
	const topResult = await waitForResult(
		forceQuerySelector<HTMLIFrameElement>(document)(
			"#filed_underperformerlist",
		),
	);

	// Click the top result if there is one
	topResult?.click();
}

function fillType(type: ReleaseType) {
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

function fillTitle(title: string, capitalization: CapitalizationType) {
	forceQuerySelector<HTMLInputElement>(document)("#title").value = capitalize(
		title,
		capitalization,
	);
}

function fillFormat(format: ReleaseFormat) {
	forceQuerySelector<HTMLInputElement>(document)(
		`#format${FORMAT_IDS[format]}`,
	).checked = true;
}

function fillDiscSize(discSize: DiscSize) {
	forceQuerySelector<HTMLInputElement>(document)(
		`#disc_size${DISC_SIZE_IDS[discSize]}`,
	).checked = true;
}

async function fillLabel(label: ReleaseLabel) {
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

function fillAttributes(attributes: ReleaseAttribute[]) {
	for (const attribute of attributes) fillAttribute(attribute);
}

function fillAttribute(attribute: ReleaseAttribute) {
	forceQuerySelector<HTMLInputElement>(document)(
		`#attrib${ATTRIBUTE_IDS[attribute]}`,
	).checked = true;
}

async function fillTracks(
	tracks: Track[],
	capitalization: CapitalizationType,
	preserveTrackLengths: boolean,
) {
	// Use runScript (page world) to click the javascript: href buttons - calling
	// .click() directly in a content script is blocked by CSP.
	await runScript(`document.querySelector('#goAdvancedBtn').click()`);
	const trackInput =
		forceQuerySelector<HTMLTextAreaElement>(document)("#track_advanced");
	const existingDurations = preserveTrackLengths
		? getTrackDurations(trackInput.value)
		: undefined;

	trackInput.value = formatTracks(tracks, capitalization, existingDurations);
	await runScript(`document.querySelector('#goSimpleBtn').click()`);
}

function fillSource(url: string) {
	forceQuerySelector<HTMLTextAreaElement>(document)("#notes").value = url;
}

function fillCountries(countries: string[]) {
	forceQuerySelector<HTMLTextAreaElement>(document)("#countries").value =
		countries.join(", ");
}

function fillClassifiers(classifiers: string[]) {
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
