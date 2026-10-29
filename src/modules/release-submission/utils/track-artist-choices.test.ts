import { describe, expect, test } from "vitest";

import type { TrackArtistChoices } from "./track-artist-choices";
import {
	describeTrackChoice,
	getInitialTrackChoices,
	resolveTrackArtistLabels,
	withChoice,
	withUnpickedFollowedNames,
} from "./track-artist-choices";
import { OMITTED_LABEL } from "./track-artist-links";

describe("getInitialTrackChoices", () => {
	test("leaves main artists out until each is explicitly chosen", () => {
		expect(getInitialTrackChoices(["A", "b", "C"], ["A", "B"])).toEqual(
			new Map([["A", { kind: "skipped" }]]),
		);
	});
});

describe("withChoice", () => {
	test("replaces or removes a choice without changing the original", () => {
		const choices: TrackArtistChoices = new Map([["A", { kind: "skipped" }]]);

		expect(withChoice(choices, "B", { kind: "skipped" }).size).toBe(2);
		expect(withChoice(choices, "A", undefined)).toEqual(new Map());
		expect(choices.size).toBe(1);
	});
});

describe("resolveTrackArtistLabels", () => {
	const releaseLabels = new Map([
		["Release A", "[Artist1]"],
		["Release B", "Release B"],
	]);

	test("resolves each kind of choice", () => {
		const choices: TrackArtistChoices = new Map([
			["A", { kind: "linked", token: "[Artist2]" }],
			["B", { kind: "text" }],
			["C", { kind: "following", releaseName: "Release A" }],
			["D", { kind: "following", releaseName: "Release B" }],
			["E", { kind: "skipped" }],
		]);

		expect(resolveTrackArtistLabels(choices, releaseLabels)).toEqual(
			new Map([
				["A", "[Artist2]"],
				["B", "B"],
				["C", "[Artist1,C]"],
				["D", "Release B"],
				["E", OMITTED_LABEL],
			]),
		);
	});

	test("leaves out a track artist following an unpicked release artist", () => {
		const choices: TrackArtistChoices = new Map([
			["A", { kind: "following", releaseName: "Release C" }],
		]);

		expect(resolveTrackArtistLabels(choices, releaseLabels)).toEqual(new Map());
	});

	test("preserves imported aliases when following the same or a differently named release artist", () => {
		expect(
			resolveTrackArtistLabels(
				new Map([
					["zavet", { kind: "following", releaseName: "zavet" }],
					["Other alias", { kind: "following", releaseName: "zavet" }],
				]),
				new Map([["zavet", "[Artist1479561,zavet]"]]),
			),
		).toEqual(
			new Map([
				["zavet", "[Artist1479561,zavet]"],
				["Other alias", "[Artist1479561,Other alias]"],
			]),
		);
	});
});

describe("withUnpickedFollowedNames", () => {
	test("labels only unpicked followers by their own name", () => {
		const choices: TrackArtistChoices = new Map([
			["A", { kind: "following", releaseName: "Release A" }],
			["B", { kind: "following", releaseName: "Release B" }],
		]);

		expect(
			withUnpickedFollowedNames(choices, new Map([["A", "[Artist1]"]])),
		).toEqual(
			new Map([
				["A", "[Artist1]"],
				["B", "B"],
			]),
		);
	});
});

describe("describeTrackChoice", () => {
	test("describes each kind of choice", () => {
		expect(describeTrackChoice(undefined, undefined)).toBe("not chosen yet");
		expect(describeTrackChoice({ kind: "text" }, "A")).toBe("name as text");
		expect(describeTrackChoice({ kind: "skipped" }, OMITTED_LABEL)).toBe(
			"left out of titles",
		);
		expect(
			describeTrackChoice({ kind: "linked", token: "[Artist1]" }, "[Artist1]"),
		).toBe("[Artist1]");
	});

	test("describes following a release artist", () => {
		const following = { kind: "following", releaseName: "R" } as const;

		expect(describeTrackChoice(following, undefined)).toBe(
			"same as R (not chosen yet)",
		);
		expect(describeTrackChoice(following, "R")).toBe(
			"same as R (name as text)",
		);
		expect(describeTrackChoice(following, "[Artist1]")).toBe(
			"same as R ([Artist1])",
		);
	});
});
