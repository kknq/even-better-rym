// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import type { Track } from "../types";
import { getMetalArchivesCredits, getReleasePersonnel } from "./credits";

const row = (name: string, role: string, linked = true) => `
	<tr class="lineupRow"><td>${linked ? `<a href="/artists/Person/123">${name}</a>` : name}</td><td>${role}</td></tr>`;
const page = (lineup = "", guest = "", misc = "") =>
	new DOMParser().parseFromString(
		`
		<div id="album_tabs_lineup">
			<div id="album_all_members_lineup"><table>
				<tr class="lineupHeaders"><td>Band members</td></tr>${lineup}
				<tr class="lineupHeaders"><td>Guest/Session</td></tr>${guest}
				<tr class="lineupHeaders"><td>Miscellaneous staff</td></tr>${misc}
			</table></div>
			<div id="album_members_lineup"><table>${lineup}</table></div>
			<div id="album_members_guest"><table>${guest}</table></div>
			<div id="album_members_misc"><table>${misc}</table></div>
		</div>
	`,
		"text/html",
	);
const tracks: Track[] = Array.from({ length: 11 }, (_, index) => ({
	position: String(index + 1),
	title: `Song ${index + 1}`,
}));

test("extracts release-specific personnel once, retaining source role and identity", () => {
	const document_ = page(
		row("Alias", "Guitars, Lyrics (tracks 1, 5, 7, 8)"),
		row("Guest", "Vocals (backing) (tracks 4 &amp; 10)"),
		row("Plain Name", "Photography", false),
	);
	expect(getReleasePersonnel(document_)).toEqual([
		{
			name: "Alias",
			url: "https://www.metal-archives.com/artists/Person/123",
			category: "lineup",
			sourceRole: "Guitars, Lyrics (tracks 1, 5, 7, 8)",
		},
		{
			name: "Guest",
			url: "https://www.metal-archives.com/artists/Person/123",
			category: "guest",
			sourceRole: "Vocals (backing) (tracks 4 & 10)",
		},
		{ name: "Plain Name", category: "misc", sourceRole: "Photography" },
	]);
});

test("uses only Complete Lineup when category views are absent or contain duplicates", () => {
	const document_ = page(
		row("Alias", "Vocals"),
		row("Guest", "Vocals (tracks 2)"),
		row("Producer", "Producer"),
	);
	document_
		.querySelector("#album_members_lineup table")
		?.insertAdjacentHTML("beforeend", row("Not in complete", "Bass"));
	expect(getReleasePersonnel(document_).map((person) => person.name)).toEqual([
		"Alias",
		"Guest",
		"Producer",
	]);
	for (const selector of [
		"#album_members_lineup",
		"#album_members_guest",
		"#album_members_misc",
	]) {
		document_.querySelector(selector)?.remove();
	}
	expect(
		getReleasePersonnel(document_).map((person) => person.category),
	).toEqual(["lineup", "guest", "misc"]);
	expect(getMetalArchivesCredits(document_, tracks).trackCredits[1]).toEqual([
		{ name: "Guest", role: "vocals" },
	]);
});

test("retains scoped credits only for uniquely numbered songs across disc headings", () => {
	const result = getMetalArchivesCredits(
		page(row("Person", "Vocals (tracks 1-3)")),
		[
			{ position: "", title: "Disc 1", header: true },
			{ position: "1" },
			{ position: "2" },
			{ position: "", title: "Disc 2", header: true },
			{ position: "3" },
		],
	);
	expect(result.trackCredits).toEqual([
		[],
		[{ name: "Person", role: "vocals" }],
		[{ name: "Person", role: "vocals" }],
		[],
		[{ name: "Person", role: "vocals" }],
	]);
});

test("keeps per-role scopes separate and treats unscoped roles as release-wide", () => {
	const result = getMetalArchivesCredits(
		page(
			row("Chris Barnes", "Vocals, Lyrics (tracks 1-11)") +
				row("Jack Owen", "Guitars, Lyrics (tracks 1, 5, 7, 8), Songwriting"),
			row("Glen Benton", "Vocals (backing) (tracks 4 &amp; 10)"),
			row("Scott Burns", "Producer, Engineering") +
				row("Vincent Locke", "Cover art, Typography") +
				row("Stephanie Cabral", "Photography (Jack Owen photo)"),
		),
		tracks,
	);
	expect(result.trackCredits[0]).toEqual([
		{ name: "Chris Barnes", role: "lyrics" },
		{ name: "Jack Owen", role: "lyrics" },
	]);
	expect(result.trackCredits[3]).toEqual([
		{ name: "Chris Barnes", role: "lyrics" },
		{ name: "Glen Benton", role: "backing vocals" },
	]);
	expect(result.trackCredits[9]).toContainEqual({
		name: "Glen Benton",
		role: "backing vocals",
	});
	expect(result.trackCredits[10]).not.toContainEqual({
		name: "Glen Benton",
		role: "backing vocals",
	});
	expect(result.unverifiedCredits).toEqual([]);
	expect(result.releaseCredits).toEqual([
		{ name: "Chris Barnes", role: "vocals" },
		{ name: "Jack Owen", role: "guitars" },
		{ name: "Jack Owen", role: "songwriting" },
		{ name: "Scott Burns", role: "producer" },
		{ name: "Scott Burns", role: "engineer" },
		{ name: "Vincent Locke", role: "cover art" },
		{ name: "Vincent Locke", role: "typography" },
		{ name: "Stephanie Cabral", role: "photography (jack owen photo)" },
	]);
});

test("supports separate bare numeric scopes and instrument qualifiers", () => {
	const result = getMetalArchivesCredits(
		page(row("Person", "Guitars (1-3), Bass (4), Vocals (lead) (tracks 5, 6)")),
		tracks,
	);
	expect(result.trackCredits.slice(0, 3)).toEqual(
		Array.from({ length: 3 }, () => [{ name: "Person", role: "guitars" }]),
	);
	expect(result.trackCredits[3]).toEqual([{ name: "Person", role: "bass" }]);
	expect(result.trackCredits[4]).toEqual([
		{ name: "Person", role: "lead vocals" },
	]);
	expect(result.unverifiedCredits).toEqual([]);
});

describe("uncertain evidence", () => {
	test.each([
		"Vocals (tracks 1, 99)",
		"Vocals (tracks 4-2)",
		"Vocals (tracks all)",
		"Vocals (tracks 1 & 2, bonus)",
		"Vocals (tracks 1-3",
		"Vocals (1-3) (lead)",
		"Vocals (disc 1)",
		"Vocals (tracks 1) (tracks 2)",
		"Vocals (additional, tracks 1, 99)",
		"Vocals (female, tracks all)",
		"Vocals (track 1, track 2)",
	])("does not expand %s into invented song participation", (role) => {
		const result = getMetalArchivesCredits(page(row("Person", role)), tracks);
		expect(result.trackCredits.every((credits) => credits.length === 0)).toBe(
			true,
		);
		expect(result.unverifiedCredits).toEqual([
			{ name: "Person", role: role.toLowerCase() },
		]);
		expect(result.releaseCredits).toEqual([]);
	});

	test.each([
		["Vocals (additional, track 1)", "vocals (additional)", [0]],
		["Vocals (female, track 3)", "vocals (female)", [2]],
		["Vocals (backing, tracks 1, 3)", "backing vocals", [0, 2]],
		["Vocals [additional, tracks 1-3]", "vocals [additional]", [0, 1, 2]],
		[
			"Guitars (lead, rhythm, tracks 1 &amp; 3)",
			"guitars (lead, rhythm)",
			[0, 2],
		],
	])("separates qualifiers from combined track scopes in %s", (sourceRole, role, indexes) => {
		const result = getMetalArchivesCredits(
			page(row("Person", sourceRole)),
			tracks,
		);
		expect(result.trackCredits).toEqual(
			tracks.map((_, index) =>
				indexes.includes(index) ? [{ name: "Person", role }] : [],
			),
		);
		expect(result.releaseCredits).toEqual([]);
		expect(result.unverifiedCredits).toEqual([]);
	});

	test("keeps missing-role people in review instead of inventing a role", () => {
		expect(
			getMetalArchivesCredits(page(row("Person", "")), tracks)
				.unverifiedCredits,
		).toEqual([{ name: "Person" }]);
	});

	test("rejects ambiguous disc-reset positions and missing positions within ranges", () => {
		for (const ambiguous of [
			[
				{ position: "1" },
				{ position: "", title: "Disc 2", header: true },
				{ position: "1" },
			],
			[{ position: "1" }, { position: "3" }],
		]) {
			const result = getMetalArchivesCredits(
				page(row("Person", "Vocals (tracks 1-3)")),
				ambiguous,
			);
			expect(result.unverifiedCredits).toHaveLength(1);
			expect(result.trackCredits.every((credits) => credits.length === 0)).toBe(
				true,
			);
		}
	});
});

test("maps side-specific positions without assigning credits to headers or the other split side", () => {
	const result = getMetalArchivesCredits(
		page("", row("Guest", "Vocals (tracks A1-A2)")),
		[
			{ header: true, title: "Side A", position: "" },
			{ position: "A1" },
			{ position: "A2" },
			{ header: true, title: "Side B", position: "" },
			{ position: "B1" },
			{ position: "B2" },
		],
	);
	expect(result.trackCredits).toEqual([
		[],
		[{ name: "Guest", role: "vocals" }],
		[{ name: "Guest", role: "vocals" }],
		[],
		[],
		[],
	]);
});

test("deduplicates roles across categories without losing distinct roles", () => {
	const result = getMetalArchivesCredits(
		page(
			row("Person", "Vocals (tracks 1)"),
			row("Person", "Vocals (tracks 1)"),
			row("Person", "Photography") +
				row("Person", "Photography") +
				row("Person", "Logo"),
		),
		tracks,
	);
	expect(result.trackCredits[0]).toEqual([{ name: "Person", role: "vocals" }]);
	expect(result.unverifiedCredits).toEqual([]);
	expect(result.releaseCredits).toEqual([
		{ name: "Person", role: "photography" },
		{ name: "Person", role: "logo" },
	]);
});

test("retains whole-release roles and qualifiers even without an imported tracklist", () => {
	const result = getMetalArchivesCredits(
		page(
			row(
				"Person",
				"All instruments, Guitars [lead, rhythm], Photography (Jack Owen photo)",
			),
		),
		[],
	);
	expect(result.releaseCredits).toEqual([
		{ name: "Person", role: "all instruments" },
		{ name: "Person", role: "guitars [lead, rhythm]" },
		{ name: "Person", role: "photography (jack owen photo)" },
	]);
	expect(result.unverifiedCredits).toEqual([]);
});

test("distinguishes empty lineups from missing or malformed source data", () => {
	expect(getMetalArchivesCredits(page(), tracks).unverifiedCredits).toEqual([]);
	expect(() =>
		getReleasePersonnel(
			new DOMParser().parseFromString("<h1>Access denied</h1>", "text/html"),
		),
	).toThrow("lineup is unavailable");
	const malformed = page('<tr class="lineupRow"><td>No role cell</td></tr>');
	expect(() => getReleasePersonnel(malformed)).toThrow("Malformed");
	const missingCategories = new DOMParser().parseFromString(
		`<div id="album_tabs_lineup"><div id="album_all_members_lineup"><table>${row("Person", "Vocals")}</table></div></div>`,
		"text/html",
	);
	expect(getReleasePersonnel(missingCategories)).toEqual([
		{
			name: "Person",
			category: "unknown",
			url: "https://www.metal-archives.com/artists/Person/123",
			sourceRole: "Vocals",
		},
	]);
});

test("never falls back to category tabs when Complete Lineup is missing or empty", () => {
	const document_ = page(row("Person", "Vocals"));
	const complete = document_.querySelector("#album_all_members_lineup");
	complete?.replaceChildren();
	expect(getReleasePersonnel(document_)).toEqual([]);
	complete?.remove();
	expect(() => getReleasePersonnel(document_)).toThrow("lineup is unavailable");
});
