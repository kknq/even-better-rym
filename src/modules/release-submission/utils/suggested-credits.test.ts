import { expect, test } from "vitest";
import {
	getFeaturedArtists,
	getNonFeaturedTrackArtists,
	getSuggestedCredits,
} from "./suggested-credits";

test("track-title artists exclude title and metadata features but retain unrelated roles", () => {
	expect(
		getNonFeaturedTrackArtists({
			title: "Song [feat. Simon & Garfunkel]",
			artists: ["Main", "Simon & Garfunkel", "Future", "Other"],
			credits: [
				{ name: " FUTURE ", role: "featured" },
				{ name: "Other", role: "producer" },
			],
		}),
	).toEqual(["Main", "Other"]);
});

test("featured exclusion is per track and ignores headers", () => {
	expect(
		getNonFeaturedTrackArtists({
			artists: ["Main", "Guest"],
			credits: [{ name: "Guest", role: "featured" }],
		}),
	).toEqual(["Main"]);
	expect(
		getNonFeaturedTrackArtists({
			artists: ["Main", "Guest"],
			credits: [{ name: "Guest", role: "lyrics" }],
		}),
	).toEqual(["Main", "Guest"]);
	expect(
		getNonFeaturedTrackArtists({ header: true, artists: ["Guest"] }),
	).toEqual([]);
});

test("groups every person-role pair by track and leaves whole-release tracks blank", () => {
	const credits = getSuggestedCredits([
		{ header: true, title: "Disc 1" },
		{
			position: "A1",
			credits: [
				{ name: "Person", role: "producer" },
				{ name: "Person", role: "songwriting" },
				{ name: "Person", role: "producer" },
			],
		},
		{
			position: "B1",
			credits: [{ name: "Person", role: "producer" }],
		},
	]);
	expect(
		credits.map(({ name, role, positions }) => ({ name, role, positions })),
	).toEqual([
		{ name: "Person", role: "producer", positions: [] },
		{ name: "Person", role: "songwriting", positions: ["A1"] },
	]);
	expect(credits[0]?.key).not.toBe(credits[1]?.key);
});

test("WLR suggests Kanye West, Kid Cudi and Future as featured artists on the right tracks", () => {
	const tracks = Array.from({ length: 24 }, (_, i) => ({
		position: String(i + 1),
		title: "Track",
	}));
	tracks[1] = { position: "2", title: "Go2DaMoon (feat. Kanye West)" };
	tracks[5] = { position: "6", title: "M3tamorphosis [feat. Kid Cudi]" };
	tracks[9] = { position: "10", title: "Teen X (feat. Future)" };
	expect(
		getSuggestedCredits(tracks).map(({ name, role, positions }) => ({
			name,
			role,
			positions,
		})),
	).toEqual([
		{ name: "Kanye West", role: "featured", positions: ["2"] },
		{ name: "Kid Cudi", role: "featured", positions: ["6"] },
		{ name: "Future", role: "featured", positions: ["10"] },
	]);
});

test("finds multiple bracketed featured artists, deduplicating title and metadata credits", () => {
	expect(
		getFeaturedArtists("Track (FEAT. A & B) [featuring C] (live)"),
	).toEqual(["A", "B", "C"]);
	expect(getFeaturedArtists("Unbracketed feat. Someone")).toEqual([]);
	expect(
		getFeaturedArtists("Track (feat. Simon & Garfunkel)", [
			"Simon & Garfunkel",
		]),
	).toEqual(["Simon & Garfunkel"]);
	expect(
		getSuggestedCredits([
			{
				title: "Track (feat. A)",
				credits: [{ name: "A", role: "featured" }],
			},
		]),
	).toHaveLength(1);
});

test("uses the shared position fallback and does not mistake missing credits for all-track coverage", () => {
	const result = getSuggestedCredits([
		{ credits: [{ name: "A", role: "mixing" }] },
		{ title: "No credits" },
	]);
	expect(result[0]?.positions).toEqual(["1"]);
});
