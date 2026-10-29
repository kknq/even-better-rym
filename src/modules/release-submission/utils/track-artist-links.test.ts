import { describe, expect, test } from "vitest";

import {
	applyTrackTitles,
	buildLinkedTitle,
	buildRelinkPlan,
	getChangedTitles,
	getDistinctTrackArtists,
	getTrackKeys,
	getUntetheredKeys,
	hasDifferingTrackArtists,
	hasSameMembers,
	isVariousArtistsRelease,
	OMITTED_LABEL,
	prefixesTrackArtists,
	readTrackTitles,
	resetTrackTitle,
	tetherTrackTitles,
	withReleaseArtistFallback,
	writeTrackTitles,
} from "./track-artist-links";

describe("hasSameMembers", () => {
	test("ignores order and repeats", () => {
		expect(hasSameMembers(["A", "B", "A"], ["B", "A"])).toBe(true);
	});

	test("notices a missing or extra member", () => {
		expect(hasSameMembers(["A"], ["A", "B"])).toBe(false);
		expect(hasSameMembers(["A", "C"], ["A"])).toBe(false);
	});
});

describe("isVariousArtistsRelease", () => {
	test("is true for a Various Artists release, in any case", () => {
		expect(isVariousArtistsRelease(["Various Artists"])).toBe(true);
		expect(isVariousArtistsRelease(["various artists"])).toBe(true);
	});

	test("is false for any other release", () => {
		expect(isVariousArtistsRelease(["A", "B"])).toBe(false);
		expect(isVariousArtistsRelease([])).toBe(false);
	});
});

describe("prefixesTrackArtists", () => {
	test("is true on a Various Artists release", () => {
		expect(prefixesTrackArtists([], ["Various Artists"])).toBe(true);
	});

	test("is true on a split, where each track has one release artist", () => {
		const tracks = [{ artists: ["Barbelith"] }, { artists: ["Trhä"] }];

		expect(prefixesTrackArtists(tracks, ["Barbelith", "Trhä"])).toBe(true);
	});

	test("is true when tracks leave out the release's artists", () => {
		const tracks = [
			{ artists: ["Konstantin Schimanowski"] },
			{ artists: ["1000 Eyes", "Konstantin Schimanowski", "Tom Schley"] },
		];

		expect(prefixesTrackArtists(tracks, ["1000 Eyes", "Tom Schley"])).toBe(
			true,
		);
	});

	test("is false when every track keeps the release's artists", () => {
		const tracks = [
			{ artists: ["A"] },
			{ artists: ["A", "Guest"] },
			{ artists: [] },
			{},
			{ header: true, artists: ["B"] },
		];

		expect(prefixesTrackArtists(tracks, ["A"])).toBe(false);
	});

	test("compares names exactly", () => {
		const tracks = [{ artists: ["tom schley"] }];

		expect(prefixesTrackArtists(tracks, ["Tom Schley"])).toBe(true);
	});
});

describe("withReleaseArtistFallback", () => {
	test("gives tracks with no artists the release's artists", () => {
		const tracks = [{ position: "1" }, { position: "2", artists: [] }];

		expect(withReleaseArtistFallback(tracks, ["A", "B"])).toEqual([
			{ position: "1", artists: ["A", "B"] },
			{ position: "2", artists: ["A", "B"] },
		]);
	});

	test("keeps a track's own artists", () => {
		const tracks = [{ position: "1", artists: ["C"] }];

		expect(withReleaseArtistFallback(tracks, ["A"])).toEqual(tracks);
	});
});

describe("hasDifferingTrackArtists", () => {
	test("is false when every track has the release's artists or none", () => {
		const tracks = [
			{ artists: ["A", "B"] },
			{ artists: ["B", "A"] },
			{ artists: [] },
			{},
		];

		expect(hasDifferingTrackArtists(tracks, ["A", "B"])).toBe(false);
	});

	test("is true when a track has an artist not on the release", () => {
		const tracks = [{ artists: ["A"] }, { artists: ["A", "C"] }];

		expect(hasDifferingTrackArtists(tracks, ["A"])).toBe(true);
	});

	test("is true when a track lacks one of the release's artists", () => {
		const tracks = [{ artists: ["A"] }];

		expect(hasDifferingTrackArtists(tracks, ["A", "B"])).toBe(true);
	});

	test("compares names exactly", () => {
		const tracks = [{ artists: ["tom schley"] }];

		expect(hasDifferingTrackArtists(tracks, ["Tom Schley"])).toBe(true);
	});
});

describe("getDistinctTrackArtists", () => {
	test("lists each artist once, in first-appearance order", () => {
		const tracks = [
			{ artists: ["A"] },
			{ artists: ["A", "B"] },
			{ artists: ["B", "C"] },
		];

		expect(getDistinctTrackArtists(tracks)).toEqual(["A", "B", "C"]);
	});

	test("returns nothing when no track has artists", () => {
		expect(getDistinctTrackArtists([{}])).toEqual([]);
	});
});

describe("getTrackKeys", () => {
	test("numbers repeats of a position", () => {
		expect(getTrackKeys(["1", "2", "1"])).toEqual(["1#1", "2#1", "1#2"]);
	});

	test("gives no key where there is no position", () => {
		expect(getTrackKeys([undefined, "1"])).toEqual([undefined, "1#1"]);
	});
});

describe("buildRelinkPlan", () => {
	test("maps each track's artists to their labels in track order", () => {
		const tracks = [
			{ position: "1", artists: ["A"] },
			{ position: "2", artists: ["B", "A"] },
		];
		const labels = new Map([
			["A", "[Artist1]"],
			["B", "[Artist2]"],
		]);

		expect(buildRelinkPlan(tracks, labels)).toEqual(
			new Map([
				["1#1", ["[Artist1]"]],
				["2#1", ["[Artist2]", "[Artist1]"]],
			]),
		);
	});

	test("falls back to the plain name for an artist with no label", () => {
		const tracks = [{ position: "1", artists: ["A", "B"] }];
		const labels = new Map([["A", "[Artist1]"]]);

		expect(buildRelinkPlan(tracks, labels)).toEqual(
			new Map([["1#1", ["[Artist1]", "B"]]]),
		);
	});

	test("leaves out omitted artists", () => {
		const tracks = [
			{ position: "1", artists: ["A", "B"] },
			{ position: "2", artists: ["B"] },
		];
		const labels = new Map([
			["A", "[Artist1]"],
			["B", OMITTED_LABEL],
		]);

		expect(buildRelinkPlan(tracks, labels)).toEqual(
			new Map([
				["1#1", ["[Artist1]"]],
				["2#1", []],
			]),
		);
	});

	test("keeps tracks with a repeated position apart", () => {
		const tracks = [
			{ position: "1", artists: ["A"] },
			{ position: "1", artists: ["B"] },
		];

		expect(buildRelinkPlan(tracks, new Map())).toEqual(
			new Map([
				["1#1", ["A"]],
				["1#2", ["B"]],
			]),
		);
	});

	test("uses the displayed fallback position for tracks with no position", () => {
		expect(buildRelinkPlan([{ artists: ["A"] }], new Map())).toEqual(
			new Map([["1#1", ["A"]]]),
		);
	});
});

describe("readTrackTitles", () => {
	test("reads each track's trimmed title by key", () => {
		expect(
			readTrackTitles(" 1 | First |3:00\n\nno separators\n1|Again|"),
		).toEqual(
			new Map([
				["1#1", "First"],
				["1#2", "Again"],
			]),
		);
	});
});

describe("writeTrackTitles", () => {
	test("replaces only the given tracks' titles", () => {
		const text = "1|First|3:00\n\n2|Second|4:00";

		expect(writeTrackTitles(text, new Map([["2#1", "New"]]))).toBe(
			"1|First|3:00\n\n2|New|4:00",
		);
	});
});

describe("getChangedTitles", () => {
	test("returns the titles that differ", () => {
		expect(getChangedTitles("1|A|3:00\n2|B|", "1|A|3:00\n2|C|")).toEqual(
			new Map([["2#1", "C"]]),
		);
	});

	test("returns undefined when anything besides titles differs", () => {
		expect(getChangedTitles("1|A|3:00", "1|B|3:01")).toBeUndefined();
		expect(getChangedTitles("1|A|", "1|A|\n2|B|")).toBeUndefined();
	});
});

describe("applyTrackTitles", () => {
	const plan = new Map([
		["1#1", ["[Artist1]"]],
		["2#1", ["[Artist1]", "Plain"]],
	]);

	test("prefixes planned tracks and remembers their base titles", () => {
		const applied = applyTrackTitles(
			"1|First|3:00\n2|Second|\n3|Third|",
			plan,
			new Map(),
		);

		expect(applied.text).toBe(
			"1|[Artist1] - First|3:00\n2|[Artist1] & Plain - Second|\n3|Third|",
		);
		expect(applied.tether.get("1#1")).toEqual({
			base: "First",
			written: "[Artist1] - First",
		});
	});

	test("writes the base title alone when a track has no labels", () => {
		const first = applyTrackTitles("1|First|", plan, new Map());
		const applied = applyTrackTitles(
			first.text,
			new Map([["1#1", []]]),
			first.tether,
		);

		expect(applied.text).toBe("1|First|");
	});

	test("rewrites tethered tracks from their base titles", () => {
		const first = applyTrackTitles("1|First|\n2|Second|", plan, new Map());
		const newPlan = new Map([
			["1#1", ["[Artist2]"]],
			["2#1", ["[Artist2]"]],
		]);

		expect(applyTrackTitles(first.text, newPlan, first.tether).text).toBe(
			"1|[Artist2] - First|\n2|[Artist2] - Second|",
		);
	});

	test("leaves a track edited by hand alone", () => {
		const first = applyTrackTitles("1|First|\n2|Second|", plan, new Map());
		const edited = first.text.replace("[Artist1] - First", "Typed");
		const newPlan = new Map([["1#1", ["[Artist2]"]]]);
		const applied = applyTrackTitles(edited, newPlan, first.tether);

		expect(applied.text).toBe(edited);
		expect(applied.tether.get("1#1")).toEqual(first.tether.get("1#1"));
	});
});

describe("getUntetheredKeys", () => {
	test("lists tracks whose title differs from the written one", () => {
		const tether = new Map([
			["1#1", { base: "First", written: "A - First" }],
			["2#1", { base: "Second", written: "A - Second" }],
		]);

		expect(
			getUntetheredKeys("1|Typed|\n2| A - Second |\n3|Third|", tether),
		).toEqual(["1#1"]);
	});
});

describe("resetTrackTitle", () => {
	test("writes the base title with the planned labels and tethers it", () => {
		const applied = {
			text: "1|Typed|3:00",
			tether: new Map([["1#1", { base: "First", written: "A - First" }]]),
		};
		const plan = new Map([["1#1", ["[Artist2]"]]]);
		const reset = resetTrackTitle(applied, plan, "1#1");

		expect(reset.text).toBe("1|[Artist2] - First|3:00");
		expect(reset.tether.get("1#1")).toEqual({
			base: "First",
			written: "[Artist2] - First",
		});
	});

	test("restores the base title before any labels are applied", () => {
		const applied = {
			text: "1|Typed|3:00",
			tether: new Map([["1#1", { base: "First", written: "First" }]]),
		};
		const reset = resetTrackTitle(applied, new Map(), "1#1");

		expect(reset.text).toBe("1|First|3:00");
		expect(reset.tether.get("1#1")).toEqual({
			base: "First",
			written: "First",
		});
	});

	test("leaves a track the picker never wrote unchanged", () => {
		const applied = { text: "1|Typed|", tether: new Map() };

		expect(resetTrackTitle(applied, new Map([["1#1", ["A"]]]), "1#1")).toBe(
			applied,
		);
	});
});

describe("tetherTrackTitles", () => {
	test("ties each track to its current trimmed title", () => {
		expect(tetherTrackTitles("1| First |\nnot a track\n1|Again|")).toEqual(
			new Map([
				["1#1", { base: "First", written: "First" }],
				["1#2", { base: "Again", written: "Again" }],
			]),
		);
	});
});

describe("buildLinkedTitle", () => {
	const tests: [string[], string][] = [
		[["[Artist1]"], "[Artist1] - Title"],
		[["[Artist1]", "[Artist2]"], "[Artist1] & [Artist2] - Title"],
		[
			["[Artist1]", "Plain Name", "[Artist3]"],
			"[Artist1], Plain Name & [Artist3] - Title",
		],
	];

	test.each(tests)("prefixes %j", (labels, expected) => {
		expect(buildLinkedTitle("Title", labels)).toBe(expected);
	});

	test("leaves the caller's labels untouched", () => {
		const labels = ["[Artist1]", "[Artist2]", "[Artist3]"];
		buildLinkedTitle("Title", labels);

		expect(labels).toEqual(["[Artist1]", "[Artist2]", "[Artist3]"]);
	});
});
