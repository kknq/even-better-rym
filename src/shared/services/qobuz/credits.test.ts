import { expect, test } from "vitest";
import { getSuggestedCredits } from "~/modules/release-submission/utils/suggested-credits";
import type { QobuzTrack } from "./codec";
import { readTrackCredits } from "./credits";

const track: QobuzTrack = {
	id: 1,
	title: "Song",
	duration: 60,
	track_number: 1,
	media_number: 1,
	performer: { name: "Main", roles: [] },
};

test("extracts contributor roles without treating engineers or writers as track artists", () => {
	expect(
		readTrackCredits(
			{
				...track,
				performers:
					"Main, MainArtist, Vocals - Guest, FeaturedArtist, ComposerLyricist - Engineer, MixingEngineer, RecordingEngineer - Player, Unusual Instrument",
			},
			["Main"],
		),
	).toEqual({
		artists: ["Main", "Guest"],
		credits: [
			{ name: "Main", role: "vocals" },
			{ name: "Guest", role: "featured" },
			{ name: "Guest", role: "songwriting" },
			{ name: "Engineer", role: "mixing engineer" },
			{ name: "Engineer", role: "recording engineer" },
			{ name: "Player", role: "unusual instrument" },
		],
	});
});

test("preserves names with commas, conjunctions and spaced hyphens instead of splitting artists", () => {
	const performer = { name: "Tyler, The Creator", roles: [] };
	const composer = { name: "Composer, Jr.", roles: [] };
	expect(
		readTrackCredits(
			{
				...track,
				performer,
				composer,
				performers:
					"Tyler, The Creator, MainArtist - Simon & Garfunkel, FeaturedArtist - Band - Name, Guitar - Composer, Jr., Composer",
			},
			[performer.name],
		),
	).toEqual({
		artists: [performer.name, "Simon & Garfunkel"],
		credits: [
			{ name: "Simon & Garfunkel", role: "featured" },
			{ name: "Band - Name", role: "guitar" },
			{ name: composer.name, role: "composer" },
		],
	});
});

test("uses a structured track composer only when the detailed contributor list is absent", () => {
	const composer = { name: "Named Composer", roles: [] };
	expect(readTrackCredits({ ...track, composer }, ["Main"]).credits).toEqual([
		{ name: composer.name, role: "composer" },
	]);
	expect(
		readTrackCredits(
			{
				...track,
				composer,
				performers: "Main, MainArtist - Credited Alias, Composer",
			},
			["Main"],
		).credits,
	).toEqual([{ name: "Credited Alias", role: "composer" }]);
	expect(readTrackCredits(track, ["Main"])).toEqual({
		artists: ["Main"],
		credits: [],
	});
});

test("retains newly discovered co-main artists, with ordinary roles combined by the shared workflow", () => {
	const details = readTrackCredits(
		{
			...track,
			performers:
				"Main, MainArtist - Other Main, MainArtist, Producer, Composer - Engineer, MasteringEngineer",
		},
		["Main", "Other Main"],
	);
	expect(details.artists).toEqual(["Main", "Other Main"]);
	expect(getSuggestedCredits([details])).toMatchObject([
		{ name: "Other Main", role: "producer, composer", positions: [] },
		{ name: "Engineer", role: "mastering engineer", positions: [] },
	]);
});

test.each([
	"Missing roles",
	", Composer",
	"Name,",
	"Name, Composer, ",
	"Name, Composer - ",
])("rejects malformed contributor lists rather than claiming no credits: %j", (performers) => {
	expect(() => readTrackCredits({ ...track, performers }, ["Main"])).toThrow(
		/Qobuz/,
	);
});
