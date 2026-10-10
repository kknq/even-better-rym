import { describe, expect, test } from "vitest";

import type { TrackArtistChoices } from "./track-artist-choices";
import {
	describeTrackChoice,
	getInitialTrackChoices,
	resolveTrackArtistLabels,
	withChoice,
	withUnpickedFollowedNames,
} from "./track-artist-choices";

describe("getInitialTrackChoices", () => {
	test("has identically spelled track artists follow the release artist", () => {
		expect(getInitialTrackChoices(["A", "b", "C"], ["A", "B"])).toEqual(
			new Map([["A", { kind: "following", releaseName: "A" }]]),
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
			["B", { kind: "skipped" }],
			["C", { kind: "following", releaseName: "Release A" }],
			["D", { kind: "following", releaseName: "Release B" }],
		]);

		expect(resolveTrackArtistLabels(choices, releaseLabels)).toEqual(
			new Map([
				["A", "[Artist2]"],
				["B", "B"],
				["C", "[Artist1]"],
				["D", "Release B"],
			]),
		);
	});

	test("leaves out a track artist following an unpicked release artist", () => {
		const choices: TrackArtistChoices = new Map([
			["A", { kind: "following", releaseName: "Release C" }],
		]);

		expect(resolveTrackArtistLabels(choices, releaseLabels)).toEqual(new Map());
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
		expect(describeTrackChoice(undefined, undefined)).toBe("not picked");
		expect(describeTrackChoice({ kind: "skipped" }, "A")).toBe("left unlinked");
		expect(
			describeTrackChoice({ kind: "linked", token: "[Artist1]" }, "[Artist1]"),
		).toBe("[Artist1]");
	});

	test("describes following a release artist", () => {
		const following = { kind: "following", releaseName: "R" } as const;

		expect(describeTrackChoice(following, undefined)).toBe(
			"follows R (not picked yet)",
		);
		expect(describeTrackChoice(following, "R")).toBe("follows R (unlinked)");
		expect(describeTrackChoice(following, "[Artist1]")).toBe(
			"follows R ([Artist1])",
		);
	});
});
