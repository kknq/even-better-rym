import { describe, expect, test } from "vitest";

import type {
	ReleaseArtistChoices,
	ReleasePickerState,
} from "./release-artist-links";
import {
	applyFiledUnderChange,
	clearRemovedChoices,
	getChosenEntries,
	getPickedChoice,
	getReleaseArtistLabels,
	getRepeatedIndexes,
	getUnchosenIds,
	hasSameEntries,
	isChosenId,
	normalizeArtistName,
	orderFiledUnderIds,
	pairInheritedArtists,
	parseArtistTokenId,
	planFiledUnderChanges,
} from "./release-artist-links";

const ENTRY_A = { id: "1", name: "Beyoncé" };
const ENTRY_B = { id: "2", name: "AC/DC" };
const ENTRY_C = { id: "3", name: "Tom Schley" };

describe("parseArtistTokenId", () => {
	test("reads the id from an artist token", () => {
		expect(parseArtistTokenId(" [Artist67636] ")).toBe("67636");
	});

	test("ignores anything else", () => {
		expect(parseArtistTokenId("[Label12]")).toBeUndefined();
		expect(parseArtistTokenId("[Artist12,Name]")).toBeUndefined();
	});
});

describe("normalizeArtistName", () => {
	test("ignores case, accents, punctuation and spacing", () => {
		expect(normalizeArtistName("Beyoncé")).toBe(normalizeArtistName("beyonce"));
		expect(normalizeArtistName("AC/DC")).toBe(normalizeArtistName("ac dc"));
	});

	test("keeps letters from other scripts", () => {
		expect(normalizeArtistName("坂本 龍一")).toBe("坂本龍一");
	});

	test("falls back to lowercase for punctuation-only names", () => {
		expect(normalizeArtistName("!!!")).toBe("!!!");
	});
});

describe("pairInheritedArtists", () => {
	test("pairs loosely matching names with parent entries", () => {
		expect(
			pairInheritedArtists(["beyonce", "Someone"], [ENTRY_A, ENTRY_B]),
		).toEqual(new Map([["beyonce", { kind: "inherited", entry: ENTRY_A }]]));
	});

	test("uses each parent entry at most once", () => {
		const choices = pairInheritedArtists(["AC/DC", "ACDC"], [ENTRY_B]);

		expect([...choices.keys()]).toEqual(["AC/DC"]);
	});

	test("doesn't pair different names", () => {
		expect(pairInheritedArtists(["Thom Schley"], [ENTRY_C]).size).toBe(0);
	});
});

describe("getChosenEntries", () => {
	test("lists linked and inherited entries in row order, once each", () => {
		const choices: ReleaseArtistChoices = new Map([
			["C", { kind: "linked", entry: ENTRY_C }],
			["A", { kind: "inherited", entry: ENTRY_A }],
			["B", { kind: "skipped" }],
			["D", { kind: "linked", entry: ENTRY_A }],
		]);

		expect(getChosenEntries(["A", "B", "C", "D"], choices)).toEqual([
			ENTRY_A,
			ENTRY_C,
		]);
	});
});

describe("hasSameEntries", () => {
	test("ignores order", () => {
		expect(hasSameEntries([ENTRY_A, ENTRY_B], [ENTRY_B, ENTRY_A])).toBe(true);
	});

	test("notices a missing or extra artist", () => {
		expect(hasSameEntries([ENTRY_A], [ENTRY_A, ENTRY_B])).toBe(false);
		expect(hasSameEntries([ENTRY_A, ENTRY_C], [ENTRY_A])).toBe(false);
	});
});

describe("planFiledUnderChanges", () => {
	test("removes unchosen managed entries and adds missing chosen ones", () => {
		const changes = planFiledUnderChanges([ENTRY_A, ENTRY_B], {
			entries: [ENTRY_A, ENTRY_C],
			managedIds: new Set(["1", "2", "3"]),
		});

		expect(changes).toEqual({ remove: ["2"], add: [ENTRY_C] });
	});

	test("leaves entries it doesn't manage", () => {
		const changes = planFiledUnderChanges([ENTRY_B], {
			entries: [],
			managedIds: new Set(),
		});

		expect(changes).toEqual({ remove: [], add: [] });
	});
});

describe("orderFiledUnderIds", () => {
	test("puts chosen ids first in chosen order, then the rest", () => {
		expect(orderFiledUnderIds(["9", "2", "1", "3"], ["1", "2", "5"])).toEqual([
			"1",
			"2",
			"9",
			"3",
		]);
	});
});

describe("getReleaseArtistLabels", () => {
	test("labels linked and inherited artists with tokens, skipped by name", () => {
		const choices: ReleaseArtistChoices = new Map([
			["A", { kind: "linked", entry: ENTRY_A }],
			["B", { kind: "inherited", entry: ENTRY_B }],
			["C", { kind: "skipped" }],
		]);

		expect(getReleaseArtistLabels(choices)).toEqual(
			new Map([
				["A", "[Artist1]"],
				["B", "[Artist2]"],
				["C", "C"],
			]),
		);
	});
});

describe("clearRemovedChoices", () => {
	test("clears linked and inherited rows whose artist is gone", () => {
		const choices: ReleaseArtistChoices = new Map([
			["A", { kind: "inherited", entry: ENTRY_A }],
			["B", { kind: "linked", entry: ENTRY_B }],
			["C", { kind: "skipped" }],
		]);

		expect(clearRemovedChoices(choices, new Set(["2"]))).toEqual(
			new Map([
				["B", { kind: "linked", entry: ENTRY_B }],
				["C", { kind: "skipped" }],
			]),
		);
	});

	test("returns the same choices when every artist is still listed", () => {
		const choices: ReleaseArtistChoices = new Map([
			["A", { kind: "linked", entry: ENTRY_A }],
		]);

		expect(clearRemovedChoices(choices, new Set(["1"]))).toBe(choices);
	});
});

describe("isChosenId", () => {
	test("finds linked and inherited artists but not skipped rows", () => {
		const choices: ReleaseArtistChoices = new Map([
			["A", { kind: "inherited", entry: ENTRY_A }],
			["Beyoncé", { kind: "skipped" }],
		]);

		expect(isChosenId(choices, "1")).toBe(true);
		expect(isChosenId(choices, "2")).toBe(false);
	});
});

describe("getUnchosenIds", () => {
	test("returns the entries no linked or inherited row chose", () => {
		const choices: ReleaseArtistChoices = new Map([
			["A", { kind: "linked", entry: ENTRY_A }],
			["AC/DC", { kind: "skipped" }],
		]);

		expect(getUnchosenIds([ENTRY_A, ENTRY_B, ENTRY_C], choices)).toEqual([
			"2",
			"3",
		]);
	});
});

describe("getPickedChoice", () => {
	test("inherits a parent artist and links any other", () => {
		expect(getPickedChoice({ id: "1", name: "beyonce" }, [ENTRY_A])).toEqual({
			kind: "inherited",
			entry: ENTRY_A,
		});
		expect(getPickedChoice(ENTRY_B, [ENTRY_A])).toEqual({
			kind: "linked",
			entry: ENTRY_B,
		});
	});
});

describe("applyFiledUnderChange", () => {
	const ARTISTS = { names: ["A", "B", "C"], parentEntries: [ENTRY_A] };

	test("links a new artist to the active row and moves to the next unpicked row", () => {
		const state: ReleasePickerState = {
			choices: new Map([["A", { kind: "skipped" }]]),
			activeName: "B",
		};

		expect(
			applyFiledUnderChange(
				state,
				{ added: [ENTRY_B], presentIds: new Set(["2"]) },
				ARTISTS,
			),
		).toEqual({
			choices: new Map([
				["A", { kind: "skipped" }],
				["B", { kind: "linked", entry: ENTRY_B }],
			]),
			activeName: "C",
		});
	});

	test("ignores an artist another row has chosen", () => {
		const state: ReleasePickerState = {
			choices: new Map([["A", { kind: "inherited", entry: ENTRY_A }]]),
			activeName: "B",
		};

		expect(
			applyFiledUnderChange(
				state,
				{ added: [ENTRY_A], presentIds: new Set(["1"]) },
				ARTISTS,
			),
		).toBe(state);
	});

	test("lets the active row pick its own artist again", () => {
		const state: ReleasePickerState = {
			choices: new Map([["B", { kind: "linked", entry: ENTRY_B }]]),
			activeName: "B",
		};

		expect(
			applyFiledUnderChange(
				state,
				{ added: [ENTRY_B], presentIds: new Set(["2"]) },
				ARTISTS,
			).activeName,
		).toBe("A");
	});

	test("clears a removed artist's row so it can be picked again", () => {
		const linked: ReleasePickerState = {
			choices: new Map([["B", { kind: "linked", entry: ENTRY_B }]]),
			activeName: undefined,
		};
		const removed = applyFiledUnderChange(
			linked,
			{ added: [], presentIds: new Set() },
			ARTISTS,
		);
		const repicked = applyFiledUnderChange(
			{ ...removed, activeName: "B" },
			{ added: [ENTRY_B], presentIds: new Set(["2"]) },
			ARTISTS,
		);

		expect(removed.choices).toEqual(new Map());
		expect(repicked.choices).toEqual(
			new Map([["B", { kind: "linked", entry: ENTRY_B }]]),
		);
	});

	test("ignores additions while no row is active", () => {
		const state: ReleasePickerState = {
			choices: new Map(),
			activeName: undefined,
		};

		expect(
			applyFiledUnderChange(
				state,
				{ added: [ENTRY_B], presentIds: new Set(["2"]) },
				ARTISTS,
			),
		).toBe(state);
	});
});

describe("getRepeatedIndexes", () => {
	test("finds later copies and skips missing ids", () => {
		expect(
			getRepeatedIndexes(["1", undefined, "2", "1", undefined, "2"]),
		).toEqual([3, 5]);
	});
});
