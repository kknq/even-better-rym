import { expect, test } from "vitest";
import {
	chartReleaseTypeLabels,
	chartReleaseTypeSingularLabels,
	chartReleaseTypes,
	collectionReleaseTypes,
	releaseTypes,
	timelineReleaseTypes,
} from "./release-types";

test("covers every discography category found in the saved artist pages", () => {
	expect(Object.keys(releaseTypes).sort()).toEqual(
		["s", "l", "m", "e", "i", "o", "j", "a", "c", "v", "b", "d", "x"].sort(),
	);
	expect(releaseTypes.m.label).toBe("Mixtapes");
	expect(releaseTypes.j.label).toBe("DJ mixes");
});

test("preserves collection filter labels, order and URL modifiers", () => {
	expect(
		collectionReleaseTypes.map(({ label, modifier }) => [label, modifier]),
	).toEqual([
		["Albums", "typs"],
		["EPs", "type"],
		["Singles", "typi"],
		["Music Videos", "typo"],
		["Mixtapes", "typm"],
		["DJ Mixes", "typj"],
		["Compilations", "typc"],
		["Videos", "typd"],
		["Bootlegs", "typb"],
		["Additional Releases", "typx"],
	]);
});

test("derives timeline categories from the same discography IDs", () => {
	expect(
		Object.fromEntries(timelineReleaseTypes.map(({ id, type }) => [id, type])),
	).toEqual({
		s: "album",
		l: "live",
		e: "ep",
		i: "single",
		x: "additional",
	});
});

test("preserves chart tokens and context-specific labels without treating songs as discography releases", () => {
	expect(chartReleaseTypes.map(({ id }) => id).sort()).toEqual(
		[
			"album",
			"ep",
			"mixtape",
			"djmix",
			"single",
			"comp",
			"video",
			"unauth",
			"musicvideo",
			"additional",
		].sort(),
	);
	expect(chartReleaseTypeLabels).toEqual({
		album: "Albums",
		ep: "EPs",
		comp: "Compilations",
		single: "Singles",
		video: "Videos",
		unauth: "Unauth/Bootlegs",
		song: "Songs",
		mixtape: "Mixtapes",
		musicvideo: "Music videos",
		djmix: "DJ mixes",
		additional: "Additional releases",
	});
	expect(chartReleaseTypeSingularLabels).toEqual({
		album: "Album",
		ep: "EP",
		mixtape: "Mixtape",
		djmix: "DJ Mix",
		single: "Single",
		comp: "Compilation",
		video: "Video",
		unauth: "Unauthorized",
		song: "Song",
		musicvideo: "Music Video",
		additional: "Additional Release",
	});
});
