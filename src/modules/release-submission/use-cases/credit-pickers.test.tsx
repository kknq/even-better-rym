// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ResolveData } from "~/shared/services/types";
import { addCreditLine, removeCreditLine } from "../utils/credit-lines";
import { loadCreditSuggestions } from "../utils/load-credit-suggestions";
import {
	attachCreditRoleSuggestions,
	updateCreditDetails,
} from "../utils/page-functions";
import { watchArtistResultClicks } from "../utils/shortcut-popup";
import injectArtistLinkPicker from "./artist-link-picker";
import injectGuestCreditPicker from "./guest-credit-picker";

vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("../utils/credit-lines", async (importOriginal) => ({
	...(await importOriginal<typeof import("../utils/credit-lines")>()),
	addCreditLine: vi.fn(),
	removeCreditLine: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../utils/load-credit-suggestions", () => ({
	loadCreditSuggestions: vi.fn(),
}));
vi.mock("../utils/shortcut-popup", () => ({
	startArtistSearch: vi.fn().mockResolvedValue(undefined),
	watchArtistResultClicks: vi.fn(() => () => undefined),
}));
vi.mock("../utils/page-functions", () => ({
	attachCreditRoleSuggestions: vi.fn().mockResolvedValue(undefined),
	updateCreditDetails: vi.fn().mockResolvedValue(undefined),
	closeShortcutPopup: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
	vi.mocked(addCreditLine).mockResolvedValue("1");
	vi.mocked(loadCreditSuggestions).mockImplementation((tracks) =>
		Promise.resolve({
			tracks,
			failedPositions: [],
		}),
	);
});

afterEach(() => {
	for (const selector of ["#creditsx", "#tracks_adv"]) {
		const container = document.querySelector(selector)?.nextElementSibling;
		if (container) render(null, container);
	}
	document.body.replaceChildren();
	vi.clearAllMocks();
});

async function setup(data: ResolveData, credits = true) {
	document.body.innerHTML =
		'<input id="parent_id" value="0"><ul id="creditsx"></ul>';
	await act(async () => {
		await injectGuestCreditPicker();
	});
	await act(() => {
		document.dispatchEvent(new CustomEvent("importEvent", { detail: {} }));
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: { data, options: { fillFields: { tracks: true, credits } } },
			}),
		);
	});
}

function rows() {
	return [
		...document.querySelectorAll<HTMLTableRowElement>(
			"#ebr-suggested-credit-picker tbody tr",
		),
	];
}

test("uses same-side vinyl ranges when accepting suggested and guest credits", async () => {
	const positions = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"];
	const credited = new Set(["A1", "A2", "A3", "A4", "B1", "B3", "B4"]);
	await setup({
		artists: ["Main"],
		tracks: positions.map((position) => ({
			position,
			artists: credited.has(position) ? ["Main", "Guest"] : ["Main"],
			credits: credited.has(position) ? [{ name: "Ozzy", role: "vocals" }] : [],
		})),
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	const expectedTracks = "A1-A4, B1, B3, B4";
	expect(rows()[0]?.cells[2]?.querySelector("input")?.value).toBe(
		expectedTracks,
	);
	for (const picker of [
		"#ebr-suggested-credit-picker",
		"#ebr-guest-credit-picker",
	]) {
		await act(() =>
			document
				.querySelector<HTMLInputElement>(
					`${picker} input[value="Credit in plain text"]`,
				)
				?.click(),
		);
	}
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledTimes(2));
	expect(addCreditLine).toHaveBeenNthCalledWith(1, {
		id: undefined,
		name: "Ozzy",
		role: "vocals",
		tracks: expectedTracks,
	});
	expect(addCreditLine).toHaveBeenNthCalledWith(2, {
		id: undefined,
		name: "Guest",
		role: "guest",
		tracks: expectedTracks,
	});
});

async function mountTrackPicker(text = "1|One|\n2|Two|") {
	document.body.insertAdjacentHTML(
		"beforeend",
		`
		<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
		<div id="tracks_adv"><textarea id="track_advanced"></textarea></div></div>
	`,
	);
	const input = document.querySelector<HTMLTextAreaElement>("#track_advanced");
	if (input) input.value = text;
	await act(async () => {
		await injectArtistLinkPicker();
	});
}

const trackRows = () => [
	...document.querySelectorAll<HTMLTableRowElement>(
		"#ebr-artist-link-picker tbody tr",
	),
];

test("sorts both credit tables by artist coverage then name without reordering source data or same-artist roles", async () => {
	const data: ResolveData = {
		artists: ["Main"],
		tracks: [
			{
				position: "1",
				artists: ["Main", "Zulu", "éclair", "beta", "Alpha"],
				credits: [
					{ name: "Zulu", role: "mastering" },
					{ name: "Alpha", role: "songwriting" },
					{ name: "beta", role: "mixing" },
					{ name: "Alpha", role: "producer" },
					{ name: "éclair", role: "vocals" },
				],
			},
			{
				position: "2",
				artists: ["Main"],
				credits: [
					{ name: "Alpha", role: "producer" },
					{ name: "Zulu", role: "mastering" },
				],
			},
			{
				position: "3",
				artists: ["Main"],
				credits: [{ name: "Zulu", role: "mastering" }],
			},
		],
	};
	const original = JSON.stringify(data);
	await setup(data);
	await vi.waitFor(() => expect(rows()).toHaveLength(5));
	const guests = [
		...document.querySelectorAll<HTMLTableRowElement>(
			"#ebr-guest-credit-picker tbody tr",
		),
	];
	expect(guests.map((row) => row.cells[0]?.textContent)).toEqual([
		"Alpha",
		"beta",
		"éclair",
		"Zulu",
	]);
	expect(
		rows().map((row) => [
			row.cells[0]?.textContent,
			row.cells[1]?.querySelector("input")?.value,
			row.cells[2]?.querySelector("input")?.value,
		]),
	).toEqual([
		["Zulu", "mastering", ""],
		["Alpha", "songwriting", "1"],
		["Alpha", "producer", "1, 2"],
		["beta", "mixing", "1"],
		["éclair", "vocals", "1"],
	]);
	await act(() =>
		rows()[1]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenLastCalledWith({
			id: undefined,
			name: "Alpha",
			role: "songwriting",
			tracks: "1",
		}),
	);
	await act(() =>
		guests[0]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenLastCalledWith({
			id: undefined,
			name: "Alpha",
			role: "guest",
			tracks: "1",
		}),
	);
	expect(JSON.stringify(data)).toBe(original);
});

test("deduplicates WLR's loaded featured credits against guests using one shared enrichment", async () => {
	let finish:
		| ((result: Awaited<ReturnType<typeof loadCreditSuggestions>>) => void)
		| undefined;
	vi.mocked(loadCreditSuggestions).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const featured = new Map([
		["2", "Kanye West"],
		["6", "Kid Cudi"],
		["10", "Future"],
	]);
	const tracks = Array.from({ length: 24 }, (_, index) => {
		const position = String(index + 1);
		const feature = featured.get(position);
		return {
			position,
			title: "Song",
			artists: feature ? ["Playboi Carti", feature] : ["Playboi Carti"],
			creditsUrl: `https://open.spotify.com/track/${position.padStart(22, "0")}`,
		};
	});
	await setup({ artists: ["Playboi Carti"], tracks });
	await mountTrackPicker("2|Go2DaMoon|\n6|M3tamorphosis|\n10|Teen X|");
	expect(
		document.querySelector("#ebr-artist-link-picker")?.textContent,
	).toContain("Loading song credits");
	expect(document.querySelector("#ebr-artist-link-picker input")).toBeNull();
	expect(
		document.querySelector<HTMLInputElement>(
			'#ebr-guest-credit-picker input[value="Credit in plain text"]',
		)?.disabled,
	).toBe(true);
	await act(() =>
		finish?.({
			tracks: tracks.map((track) => ({
				...track,
				credits: featured.has(track.position)
					? [{ name: featured.get(track.position) ?? "", role: "featured" }]
					: [],
			})),
			failedPositions: [],
		}),
	);
	await vi.waitFor(() =>
		expect(document.querySelector("#ebr-guest-credit-picker")).toBeNull(),
	);
	expect(
		rows().map((row) => [
			row.cells[0]?.textContent,
			row.cells[1]?.querySelector("input")?.value,
			row.cells[2]?.querySelector("input")?.value,
		]),
	).toEqual([
		["Future", "featured", "10"],
		["Kanye West", "featured", "2"],
		["Kid Cudi", "featured", "6"],
	]);
	expect(loadCreditSuggestions).toHaveBeenCalledOnce();
	expect(addCreditLine).not.toHaveBeenCalled();
	expect(trackRows().map((row) => row.cells[0]?.textContent)).toEqual([
		"Playboi Carti",
	]);
	expect(document.querySelector("textarea")?.value).toBe(
		"2|Go2DaMoon|\n6|M3tamorphosis|\n10|Teen X|",
	);
});

test("keeps and submits only guest appearances not covered by the person's loaded featured credits", async () => {
	vi.mocked(loadCreditSuggestions).mockImplementation((tracks) =>
		Promise.resolve({
			tracks: tracks.map((track, index) => ({
				...track,
				credits: [
					{ name: "Guest", role: index === 0 ? "featured" : "producer" },
				],
			})),
			failedPositions: [],
		}),
	);
	await setup({
		artists: ["Main"],
		tracks: [
			{
				position: "1",
				title: "One",
				artists: ["Main", "Guest"],
				creditsUrl: "song-one",
			},
			{
				position: "2",
				title: "Two",
				artists: ["Main", "Guest"],
				creditsUrl: "song-two",
			},
		],
	});
	await mountTrackPicker();
	expect(trackRows().map((row) => row.cells[0]?.textContent)).toEqual([
		"Main",
		"Guest",
	]);
	const guest = document.querySelector("#ebr-guest-credit-picker tbody tr");
	expect(guest?.textContent).toContain("tracks 2");
	expect(
		rows().map((row) => row.cells[1]?.querySelector("input")?.value),
	).toEqual(["featured", "producer"]);
	await act(() =>
		guest
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledWith({
			id: undefined,
			name: "Guest",
			role: "guest",
			tracks: "2",
		}),
	);
	await act(() =>
		trackRows()[1]
			?.querySelector<HTMLInputElement>('input[value="Put in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(document.querySelector("textarea")?.value).toBe(
			"1|One|\n2|Guest - Two|",
		),
	);
	expect(loadCreditSuggestions).toHaveBeenCalledOnce();
});

test("excludes loaded featured artists from track titles even when credit import is disabled", async () => {
	vi.mocked(loadCreditSuggestions).mockImplementation((tracks) =>
		Promise.resolve({
			tracks: tracks.map((track) => ({
				...track,
				credits: [{ name: "Guest", role: "featured" }],
			})),
			failedPositions: [],
		}),
	);
	await setup(
		{
			artists: ["Main"],
			tracks: [
				{
					position: "1",
					title: "One",
					artists: ["Main", "Guest"],
					creditsUrl: "song",
				},
			],
		},
		false,
	);
	await mountTrackPicker("1|One|");
	expect(trackRows().map((row) => row.cells[0]?.textContent)).toEqual(["Main"]);
	expect(document.querySelector("#ebr-suggested-credit-picker")).toBeNull();
	expect(document.querySelector("#ebr-guest-credit-picker")).toBeNull();
	expect(loadCreditSuggestions).toHaveBeenCalledOnce();
});

test("shares newly discovered co-main artists with the track picker without suggesting them as guests", async () => {
	vi.mocked(loadCreditSuggestions).mockImplementation((tracks) =>
		Promise.resolve({
			tracks: tracks.map((track) => ({
				...track,
				artists: ["1000 Eyes", "Tom Schley"],
				credits: [{ name: "Tom Schley", role: "composition" }],
			})),
			failedPositions: [],
		}),
	);
	await setup({
		artists: ["1000 Eyes", "Tom Schley"],
		tracks: [
			{
				position: "1",
				title: "vholume",
				artists: ["1000 Eyes"],
				creditsUrl: "https://www.deezer.com/track/4266030142",
			},
		],
	});
	await mountTrackPicker("1|vholume|");
	expect(trackRows().map((row) => row.cells[0]?.textContent)).toEqual([
		"1000 Eyes",
		"Tom Schley",
	]);
	expect(document.querySelector("#ebr-guest-credit-picker")).toBeNull();
	expect(rows()[0]?.cells[0]?.textContent).toBe("Tom Schley");
	expect(rows()[0]?.cells[1]?.querySelector("input")?.value).toBe(
		"composition",
	);
	expect(document.querySelector("textarea")?.value).toBe("1|vholume|");
	expect(loadCreditSuggestions).toHaveBeenCalledOnce();
	expect(
		vi.mocked(loadCreditSuggestions).mock.calls[0]?.[1].releaseArtists,
	).toEqual(["1000 Eyes", "Tom Schley"]);
});

test("shows suggestions below guests with separate roles and correct whole-release/subset tracks", async () => {
	await setup({
		artists: ["Main"],
		tracks: [
			{
				position: "1",
				artists: ["Guest"],
				credits: [
					{ name: "Person", role: "producer" },
					{ name: "Person", role: "songwriting" },
				],
			},
			{ position: "2", credits: [{ name: "Person", role: "producer" }] },
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(2));
	expect(
		document.querySelector("#ebr-guest-credit-picker")?.nextElementSibling?.id,
	).toBe("ebr-suggested-credit-picker");
	expect(
		[...document.querySelectorAll("#ebr-suggested-credit-picker th")].map(
			(cell) => cell.textContent,
		),
	).toEqual(["Artist", "Suggested role", "Tracks", "Status", "Actions"]);
	expect(
		rows().map((row) =>
			[...row.cells]
				.slice(0, 3)
				.map((cell) => cell.querySelector("input")?.value ?? cell.textContent),
		),
	).toEqual([
		["Person", "producer", ""],
		["Person", "songwriting", "1"],
	]);
	await act(() =>
		rows()[1]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledWith({
			id: undefined,
			name: "Person",
			role: "songwriting",
			tracks: "1",
		}),
	);
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledWith({
			id: undefined,
			name: "Person",
			role: "producer",
			tracks: "",
		}),
	);
	expect(removeCreditLine).not.toHaveBeenCalled();
});

test("linking a suggestion credits only that row when the person's roles have different coverage", async () => {
	await setup({
		tracks: [
			{
				title: "Track",
				credits: [
					{ name: "Person", role: "producer" },
					{ name: "Person", role: "songwriting" },
				],
			},
			{ title: "Other track", credits: [{ name: "Person", role: "producer" }] },
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(2));
	await act(() =>
		rows()[1]
			?.querySelector<HTMLInputElement>('input[value="Find on RYM"]')
			?.click(),
	);
	await act(() =>
		vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("12"),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledExactlyOnceWith({
			id: "12",
			name: "Person",
			role: "songwriting",
			tracks: "1",
		}),
	);
	await vi.waitFor(() =>
		expect(
			rows()[1]?.querySelector('input[value="Replace artist link"]'),
		).not.toBeNull(),
	);
	expect(
		rows()[0]?.querySelector('input[value="Replace artist link"]'),
	).not.toBeNull();
	expect(
		rows()[0]?.querySelector<HTMLInputElement>(
			'input[value="Credit with artist link"]',
		)?.disabled,
	).toBe(false);
	expect(addCreditLine).toHaveBeenCalledOnce();
});

test.each([
	false,
	true,
])("shows and accepts matching ordinary roles as one editable suggestion (subset=%s)", async (subset) => {
	const credits = [
		{ name: "Person", role: "composition" },
		{ name: "Person", role: "songwriting" },
		{ name: "Person", role: "producer" },
	];
	await setup({
		tracks: [
			{ position: "1", credits },
			{ position: "2", credits },
			{ position: "3", credits },
			...(subset ? [{ position: "4" }] : []),
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	expect(rows()[0]?.cells[1]?.querySelector("input")?.value).toBe(
		"composition, songwriting, producer",
	);
	expect(rows()[0]?.cells[2]?.querySelector("input")?.value).toBe(
		subset ? "1-3" : "",
	);
	expect(addCreditLine).not.toHaveBeenCalled();
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledExactlyOnceWith({
			id: undefined,
			name: "Person",
			role: "composition, songwriting, producer",
			tracks: subset ? "1-3" : "",
		}),
	);
	await editDetail(1, "composition, lyrics");
	await vi.waitFor(() =>
		expect(updateCreditDetails).toHaveBeenCalledExactlyOnceWith(
			"1",
			"composition, lyrics",
			subset ? "1-3" : "",
		),
	);
	expect(addCreditLine).toHaveBeenCalledOnce();
});

test("reuses release-artist links on matching suggestions without adding credits automatically", async () => {
	await setup({});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistLabelsEvent", {
				detail: {
					names: ["1000 Eyes", "Tom Schley"],
					labels: new Map([
						["1000 Eyes", "[Artist1639184]"],
						["Tom Schley", "[Artist2111224]"],
					]),
				},
			}),
		);
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: {
					data: {
						tracks: [
							{
								credits: [
									{ name: "1000 eyes", role: "producer" },
									{ name: "Tom Schley", role: "songwriting" },
									{ name: "Other", role: "mixing" },
								],
							},
						],
					},
					options: { fillFields: { tracks: true, credits: true } },
				},
			}),
		);
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(3));
	expect(rows()[0]?.cells[3]?.textContent).toContain("[Artist1639184]");
	expect(rows()[2]?.cells[3]?.textContent).toContain("[Artist2111224]");
	expect(rows()[0]?.cells[3]?.textContent).toContain("not credited");
	expect(addCreditLine).not.toHaveBeenCalled();
	expect(
		rows()[1]?.querySelector<HTMLInputElement>(
			'input[value="Credit with artist link"]',
		)?.disabled,
	).toBe(true);
	await editDetail(1, "producer, mixing");
	await editDetail(2, "2, 4");
	expect(addCreditLine).not.toHaveBeenCalled();
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>(
				'input[value="Credit with artist link"]',
			)
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledExactlyOnceWith({
			id: "1639184",
			name: "1000 eyes",
			role: "producer, mixing",
			tracks: "2, 4",
		}),
	);
	await act(() =>
		rows()[2]
			?.querySelector<HTMLInputElement>(
				'input[value="Credit with artist link"]',
			)
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenLastCalledWith({
			id: "2111224",
			name: "Tom Schley",
			role: "songwriting",
			tracks: "",
		}),
	);
});

test("shares a selected suggestion's artist link across roles, but keeps plain-text and skip decisions independent", async () => {
	await setup({
		tracks: [
			{
				credits: [
					{ name: "Person", role: "producer" },
					{ name: "Person", role: "songwriting" },
					{ name: "Person", role: "mixing" },
				],
			},
			{
				credits: [
					{ name: "Person", role: "producer" },
					{ name: "Person", role: "mixing" },
				],
			},
			{ credits: [{ name: "Person", role: "mixing" }] },
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(3));
	await act(() =>
		rows()[1]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledOnce());
	await act(() =>
		rows()[2]
			?.querySelector<HTMLInputElement>('input[value="Don\'t credit"]')
			?.click(),
	);
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>('input[value="Find on RYM"]')
			?.click(),
	);
	await act(() =>
		vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("12"),
	);
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledTimes(2));
	expect(rows()[1]?.cells[3]?.textContent).toBe("credited in plain text");
	expect(rows()[2]?.cells[3]?.textContent).toBe("not credited");
	await act(() =>
		rows()[2]
			?.querySelector<HTMLInputElement>(
				'input[value="Credit with artist link"]',
			)
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenLastCalledWith({
			id: "12",
			name: "Person",
			role: "mixing",
			tracks: "",
		}),
	);
});

test("accepts new track/release associations and clears them for the next import", async () => {
	const data: ResolveData = {
		tracks: [{ credits: [{ name: "Person", role: "producer" }] }],
	};
	await setup(data);
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("artistAssociationEvent", {
				detail: { name: "Person", artistId: "12" },
			}),
		);
	});
	expect(rows()[0]?.cells[3]?.textContent).toContain("[Artist12]");
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistLabelsEvent", {
				detail: {
					names: ["Person"],
					labels: new Map([["Person", "[Artist34]"]]),
				},
			}),
		);
	});
	expect(rows()[0]?.cells[3]?.textContent).toContain("[Artist34]");
	expect(addCreditLine).not.toHaveBeenCalled();
	await act(() => {
		document.dispatchEvent(new CustomEvent("importEvent", { detail: {} }));
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: {
					data,
					options: { fillFields: { credits: true, tracks: true } },
				},
			}),
		);
	});

	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	expect(rows()[0]?.cells[3]?.textContent).toBe("not chosen yet");
	expect(
		rows()[0]?.querySelector<HTMLInputElement>(
			'input[value="Credit with artist link"]',
		)?.disabled,
	).toBe(true);
});

test("reuses a guest's link for suggested roles without treating the roles as already credited", async () => {
	await setup({
		artists: ["Main"],
		tracks: [
			{ artists: ["Person"], credits: [{ name: "Person", role: "vocals" }] },
			{ artists: ["Main"] },
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	await act(() =>
		document
			.querySelector<HTMLInputElement>(
				'#ebr-guest-credit-picker input[value="Find on RYM"]',
			)
			?.click(),
	);
	await act(() =>
		vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("12"),
	);
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledOnce());
	await vi.waitFor(() =>
		expect(rows()[0]?.cells[3]?.textContent).toBe("[Artist12] (not credited)"),
	);
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>(
				'input[value="Credit with artist link"]',
			)
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenLastCalledWith({
			id: "12",
			name: "Person",
			role: "vocals",
			tracks: "1",
		}),
	);
	expect(addCreditLine).toHaveBeenCalledTimes(2);
	expect(removeCreditLine).not.toHaveBeenCalled();
});

test.each([
	false,
	true,
])("preserves a release artist's credited alias across suggested roles (search=%s)", async (search) => {
	await setup({
		tracks: [
			{
				credits: [
					{ name: "zavet", role: "producer" },
					{ name: "zavet", role: "vocals" },
				],
			},
			{ credits: [{ name: "zavet", role: "producer" }] },
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(2));
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistLabelsEvent", {
				detail: {
					names: ["zavet"],
					labels: new Map([["zavet", "[Artist1479561,zavet]"]]),
				},
			}),
		);
	});
	expect(rows()[0]?.cells[3]?.textContent).toBe(
		"[Artist1479561,zavet] (not credited)",
	);
	expect(addCreditLine).not.toHaveBeenCalled();
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>(
				`input[value="${search ? "Replace artist link" : "Credit with artist link"}"]`,
			)
			?.click(),
	);
	if (search)
		await act(() =>
			vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("1479561"),
		);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledExactlyOnceWith({
			id: "1479561",
			name: "zavet",
			creditedName: "zavet",
			role: "producer",
			tracks: "",
		}),
	);
	await vi.waitFor(() =>
		expect(rows()[0]?.cells[3]?.textContent).toBe("[Artist1479561,zavet]"),
	);
	expect(
		rows()[0]?.querySelector<HTMLInputElement>(
			'input[value="Credit with artist link"]',
		)?.disabled,
	).toBe(false);
	await act(() =>
		rows()[1]
			?.querySelector<HTMLInputElement>(
				'input[value="Credit with artist link"]',
			)
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenLastCalledWith({
			id: "1479561",
			name: "zavet",
			creditedName: "zavet",
			role: "vocals",
			tracks: "1",
		}),
	);
	await editDetail(1, "mixing");
	await vi.waitFor(() =>
		expect(updateCreditDetails).toHaveBeenCalledWith("1", "mixing", ""),
	);
	expect(rows()[0]?.cells[3]?.textContent).toBe("[Artist1479561,zavet]");
});

test("retains title-based featured suggestions when song-credit loading partially fails", async () => {
	vi.mocked(loadCreditSuggestions).mockImplementation((tracks) =>
		Promise.resolve({
			tracks,
			failedPositions: ["2"],
		}),
	);
	await setup({
		artists: ["Main"],
		tracks: [
			{ position: "1", title: "First", artists: ["Main", "Kanye West"] },
			{
				position: "2",
				title: "Go2DaMoon (feat. Kanye West)",
				artists: ["Main", "Kanye West"],
				creditsUrl: "song",
			},
		],
	});
	await mountTrackPicker("1|First|\n2|Go2DaMoon|");
	await vi.waitFor(() =>
		expect(document.querySelector('[role="alert"]')?.textContent).toContain(
			"tracks 2",
		),
	);
	expect(rows()[0]?.cells[0]?.textContent).toBe("Kanye West");
	expect(rows()[0]?.cells[1]?.querySelector("input")?.value).toBe("featured");
	expect(rows()[0]?.cells[2]?.querySelector("input")?.value).toBe("2");
	const guest = document.querySelector("#ebr-guest-credit-picker tbody tr");
	expect(guest?.textContent).toContain("Kanye West");
	expect(guest?.textContent).toContain("tracks 1");
	expect(guest?.textContent).not.toContain("tracks 1, 2");
	expect(
		guest?.querySelector<HTMLInputElement>(
			'input[value="Credit in plain text"]',
		)?.disabled,
	).toBe(false);
	await act(() =>
		trackRows()[1]
			?.querySelector<HTMLInputElement>('input[value="Put in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(document.querySelector("textarea")?.value).toBe(
			"1|Kanye West - First|\n2|Go2DaMoon|",
		),
	);
});

test("does not restore old guests or suggestions over a new import after cancelling loading", async () => {
	let finish:
		| ((result: Awaited<ReturnType<typeof loadCreditSuggestions>>) => void)
		| undefined;
	vi.mocked(loadCreditSuggestions).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	await setup({
		artists: ["Main"],
		tracks: [{ title: "Track", artists: ["Main", "Old"], creditsUrl: "song" }],
	});
	await mountTrackPicker();
	expect(document.querySelector('[role="status"]')).not.toBeNull();
	expect(
		document.querySelector("#ebr-guest-credit-picker")?.textContent,
	).toContain("Old");
	await act(() => {
		document.dispatchEvent(new CustomEvent("importEvent", { detail: {} }));
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: {
					data: {
						artists: ["Main"],
						tracks: [{ title: "New track", artists: ["Main", "New"] }],
					},
					options: { fillFields: { tracks: true, credits: true } },
				},
			}),
		);
	});
	await act(async () => {
		finish?.({
			tracks: [
				{
					artists: ["Main", "Old"],
					credits: [{ name: "Old", role: "producer" }],
				},
			],
			failedPositions: [],
		});
		await Promise.resolve();
	});
	expect(document.querySelector("#ebr-suggested-credit-picker")).toBeNull();
	expect(
		document.querySelector("#ebr-guest-credit-picker")?.textContent,
	).toContain("New");
	expect(
		document.querySelector("#ebr-guest-credit-picker")?.textContent,
	).not.toContain("Old");
	expect(loadCreditSuggestions).toHaveBeenCalledOnce();
	expect(trackRows().map((row) => row.cells[0]?.textContent)).toEqual([
		"Main",
		"New",
	]);
});

test("does not load or offer suggestions when credit import is disabled", async () => {
	await setup(
		{ tracks: [{ creditsUrl: "song", title: "Track (feat. Guest)" }] },
		false,
	);
	expect(loadCreditSuggestions).not.toHaveBeenCalled();
	expect(document.querySelector("#ebr-suggested-credit-picker")).toBeNull();
});

test("offers an unmapped album-wide artwork role without question-mark placeholders", async () => {
	await setup({
		tracks: [
			{ credits: [{ name: "rose-engine", role: "artwork by" }] },
			{ credits: [{ name: "rose-engine", role: "artwork by" }] },
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	expect(rows()[0]?.cells[1]?.querySelector("input")?.value).toBe("artwork by");
	expect(rows()[0]?.cells[2]?.querySelector("input")?.value).toBe("");
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledExactlyOnceWith({
			id: undefined,
			name: "rose-engine",
			role: "artwork by",
			tracks: "",
		}),
	);
});

test("puts unverified names last and prevents placeholder values from being submitted", async () => {
	await setup({
		tracks: [{ credits: [{ name: "Track Person", role: "producer" }] }],
		unverifiedCredits: [
			{ name: "Release Person", role: "mixing engineer" },
			{ name: "Description Person" },
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(3));
	expect(rows().map((row) => row.cells[0]?.textContent)).toEqual([
		"Track Person",
		"Release Person",
		"Description Person",
	]);
	expect(rows()[1]?.cells[1]?.querySelector("input")?.value).toBe(
		"mixing engineer",
	);
	expect(rows()[1]?.cells[2]?.querySelector("input")?.value).toBe("???");
	expect(rows()[2]?.cells[1]?.querySelector("input")?.value).toBe("???");
	expect(rows()[2]?.cells[2]?.querySelector("input")?.value).toBe("???");
	expect(
		rows()[2]?.querySelector<HTMLInputElement>(
			'input[value="Credit in plain text"]',
		)?.disabled,
	).toBe(true);

	const edit = async (column: number, value: string) => {
		const input = rows()[2]?.cells[column]?.querySelector("input");
		if (!input) throw new Error("Missing unverified credit detail");
		await act(() => {
			input.value = value;
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
	};
	await edit(1, "writer");
	expect(
		rows()[2]?.querySelector<HTMLInputElement>(
			'input[value="Credit in plain text"]',
		)?.disabled,
	).toBe(true);
	await edit(2, "1");
	expect(
		rows()[2]?.querySelector<HTMLInputElement>(
			'input[value="Credit in plain text"]',
		)?.disabled,
	).toBe(false);
	await act(() =>
		rows()[2]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenLastCalledWith({
			id: undefined,
			name: "Description Person",
			role: "writer",
			tracks: "1",
		}),
	);
});

test("only offers RYM's allowed special credits on a non-primary issue", async () => {
	await setup({
		tracks: [
			{
				title: "Track (feat. Guest)",
				credits: [{ name: "Person", role: "producer" }],
			},
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(2));
	await act(() => {
		const parent = document.querySelector<HTMLInputElement>("#parent_id");
		if (!parent) throw new Error("Missing parent input");
		parent.value = "123";
		parent.dispatchEvent(new Event("change", { bubbles: true }));
	});
	expect(rows()).toHaveLength(1);
	expect(rows()[0]?.cells[1]?.querySelector("input")?.value).toBe("featured");
});

async function editDetail(column: number, value: string) {
	const input = rows()[0]?.cells[column]?.querySelector("input");
	if (!input) throw new Error("Missing credit detail input");
	await act(() => {
		input.value = value;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	});
}

test("attaches RYM's role suggestions only to the focused role field", async () => {
	await setup({
		tracks: [
			{
				credits: [
					{ name: "Person", role: "producer" },
					{ name: "Other", role: "mixing" },
				],
			},
		],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(2));
	const role = rows()[0]?.cells[1]?.querySelector("input");
	const otherRole = rows()[1]?.cells[1]?.querySelector("input");
	const tracks = rows()[0]?.cells[2]?.querySelector("input");
	if (!role || !otherRole || !tracks) throw new Error("Missing detail inputs");
	expect(role.id).not.toBe(otherRole.id);
	expect(role.hasAttribute("data-ebr-credit-role")).toBe(true);
	await act(() => role.focus());
	expect(attachCreditRoleSuggestions).toHaveBeenCalledExactlyOnceWith(role.id);
	await act(() => tracks.focus());
	expect(attachCreditRoleSuggestions).toHaveBeenCalledOnce();
});

test("uses edited role and tracks when accepting a suggestion", async () => {
	await setup({
		tracks: [{ credits: [{ name: "Person", role: "producer" }] }],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	await editDetail(1, "producer, mixing");
	await editDetail(2, "1, 3-5");
	expect(addCreditLine).not.toHaveBeenCalled();
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>('input[value="Credit in plain text"]')
			?.click(),
	);
	await vi.waitFor(() =>
		expect(addCreditLine).toHaveBeenCalledExactlyOnceWith({
			id: undefined,
			name: "Person",
			role: "producer, mixing",
			tracks: "1, 3-5",
		}),
	);
});

test.each([
	false,
	true,
])("updates accepted details without losing the artist choice (linked=%s)", async (linked) => {
	await setup({
		tracks: [{ credits: [{ name: "Person", role: "producer" }] }],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	await act(() =>
		rows()[0]
			?.querySelector<HTMLInputElement>(
				`input[value="${linked ? "Find on RYM" : "Credit in plain text"}"]`,
			)
			?.click(),
	);
	if (linked) {
		await act(() =>
			vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("12"),
		);
	}
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledTimes(1));
	await editDetail(1, "mixing");
	await vi.waitFor(() =>
		expect(updateCreditDetails).toHaveBeenCalledExactlyOnceWith(
			"1",
			"mixing",
			"",
		),
	);
	await editDetail(2, "2");
	await vi.waitFor(() => expect(updateCreditDetails).toHaveBeenCalledTimes(2));
	expect(updateCreditDetails).toHaveBeenLastCalledWith("1", "mixing", "2");
	await editDetail(2, "");
	await vi.waitFor(() => expect(updateCreditDetails).toHaveBeenCalledTimes(3));
	expect(updateCreditDetails).toHaveBeenLastCalledWith("1", "mixing", "");
	expect(addCreditLine).toHaveBeenCalledOnce();
	expect(removeCreditLine).not.toHaveBeenCalled();
	expect(
		rows()[0]?.querySelector(
			`input[value="${linked ? "Replace artist link" : "Find on RYM"}"]`,
		),
	).not.toBeNull();
});

test("shows an error and does not add a credit with a blank role", async () => {
	await setup({
		tracks: [{ credits: [{ name: "Person", role: "producer" }] }],
	});
	await vi.waitFor(() => expect(rows()).toHaveLength(1));
	await editDetail(1, " ");
	expect(
		rows()[0]
			?.querySelector('[role="alert"] button')
			?.getAttribute("aria-label"),
	).toBe("Enter a credit role.");
	expect(
		rows()[0]?.querySelector<HTMLInputElement>(
			'input[value="Credit in plain text"]',
		)?.disabled,
	).toBe(true);
	expect(addCreditLine).not.toHaveBeenCalled();
	await editDetail(1, "mixing");
	expect(rows()[0]?.querySelector('[role="alert"]')).toBeNull();
});
