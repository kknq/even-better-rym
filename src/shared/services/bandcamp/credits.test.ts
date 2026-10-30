// @vitest-environment jsdom

import { expect, test } from "vitest";
import { parseBandcampCredits } from "./credits";

test("parses structured credit lines, joined roles, track-scoped roles, and unknown roles", () => {
	const credits = parseBandcampCredits([
		`<p>leigh - standing drumkit, lyrics<br>
jacques - bass<br>
matt - guitar, vocals</p>
<p>recorded, mixed and mastered by bob cooper<br>
artwork by dan melizan</p>`,
		`Mastered by Karl Barnes at Loom Sound Studio
music by spawn wimp idiot
decorated by travis
understood by travis
all sounds by shavis wintorp
a miracle by god
a beautiful glance from A FAR
cover painting by Patrick Quinn
most of the guitar stuff on headboard by Kora, an angel`,
	]);

	expect(credits).toEqual([
		{ name: "leigh", role: "standing drumkit" },
		{ name: "leigh", role: "lyrics" },
		{ name: "jacques", role: "bass" },
		{ name: "matt", role: "guitar" },
		{ name: "matt", role: "vocals" },
		{ name: "bob cooper", role: "recording engineer" },
		{ name: "bob cooper", role: "mixing engineer" },
		{ name: "bob cooper", role: "mastering engineer" },
		{ name: "dan melizan", role: "artwork" },
		{ name: "Karl Barnes", role: "mastering engineer" },
		{ name: "spawn wimp idiot", role: "music" },
		{ name: "travis", role: "decorated" },
		{ name: "travis", role: "understood" },
		{ name: "shavis wintorp", role: "all sounds" },
		{ name: "god", role: "a miracle" },
		{ name: "A FAR", role: "a beautiful glance" },
		{ name: "Patrick Quinn", role: "cover painting" },
		{ name: "Kora, an angel", role: "most of the guitar stuff on headboard" },
	]);
});

test("parses combined English production roles and removes location suffixes", () => {
	expect(
		parseBandcampCredits([
			`Recorded by Кальк in Micha's basement, Schwentinental
Engineered by Micha Möller
Mixed & Mastered by Jack Shirley
at The Atomic Garden, East Palo Alto
Artwork by Jacob Tomlinson`,
		]),
	).toEqual([
		{ name: "Кальк", role: "recording engineer" },
		{ name: "Micha Möller", role: "engineer" },
		{ name: "Jack Shirley", role: "mixing engineer" },
		{ name: "Jack Shirley", role: "mastering engineer" },
		{ name: "Jacob Tomlinson", role: "artwork" },
	]);
});

test("parses split-release members and separates studio roles and affiliations", () => {
	const credits = parseBandcampCredits([
		`B. Jarboe - Vocals, Guitars, Bass
D. Anton Ojeda - Vocals, Guitars, Bass, Synth
A. Sullivan - Drums, Synth`,
		"Recorded at Magpie Cage studio in Baltimore by Matt Redenbo and mastered by Kevin Bernsten of Developing Nations.",
	]);

	expect(credits).toEqual([
		{ name: "B. Jarboe", role: "vocals" },
		{ name: "B. Jarboe", role: "guitars" },
		{ name: "B. Jarboe", role: "bass" },
		{ name: "D. Anton Ojeda", role: "vocals" },
		{ name: "D. Anton Ojeda", role: "guitars" },
		{ name: "D. Anton Ojeda", role: "bass" },
		{ name: "D. Anton Ojeda", role: "synth" },
		{ name: "A. Sullivan", role: "drums" },
		{ name: "A. Sullivan", role: "synth" },
		{ name: "Matt Redenbo", role: "recording engineer" },
		{ name: "Kevin Bernsten", role: "mastering engineer" },
	]);
});

test("parses parenthetical role lists and only assigns explicit track references to those tracks", () => {
	expect(
		parseBandcampCredits([
			`Eden Brown (Vocals/Melodica)
Leah Rickman(Guitar)
Engineered by Callum Underwood
Additional vocals on track 2 by Peter
Keyboard on track 4 by Myles
Sample on track 4 from Mysterious Skin`,
		]),
	).toEqual([
		{ name: "Eden Brown", role: "vocals" },
		{ name: "Eden Brown", role: "melodica" },
		{ name: "Leah Rickman", role: "guitar" },
		{ name: "Callum Underwood", role: "engineer" },
		{ name: "Peter", role: "additional vocals", trackNumber: 2 },
		{ name: "Myles", role: "keyboard", trackNumber: 4 },
		{ name: "Mysterious Skin", role: "sample", trackNumber: 4 },
	]);
});

test("isolates credits from the full split-release description paragraph", () => {
	expect(
		parseBandcampCredits([
			"an epic, fully collaborative split between the two projects. Written together in a single room during December of 2024- January 2025. All members wrote, reordered and performed on every track. Recorded at Magpie Cage studio in Baltimore by Matt Redenbo and mastered by Kevin Bernsten of Developing Nations.",
		]),
	).toEqual([
		{ name: "Matt Redenbo", role: "recording engineer" },
		{ name: "Kevin Bernsten", role: "mastering engineer" },
	]);
});

test("separates credit sentences without splitting initials or abbreviated names", () => {
	expect(
		parseBandcampCredits([
			"Recorded by B. Jarboe. Mastered by Dr. Kevin Bernsten. Artwork by A. Sullivan.",
			"B. Jarboe - Vocals, Guitars, Bass",
			"Decorated by Travis. Understood by Shavis.",
			"А. Иванов: гитара. Б. Петров: бас.",
		]),
	).toEqual([
		{ name: "B. Jarboe", role: "recording engineer" },
		{ name: "Dr. Kevin Bernsten", role: "mastering engineer" },
		{ name: "A. Sullivan", role: "artwork" },
		{ name: "B. Jarboe", role: "vocals" },
		{ name: "B. Jarboe", role: "guitars" },
		{ name: "B. Jarboe", role: "bass" },
		{ name: "Travis", role: "decorated" },
		{ name: "Shavis", role: "understood" },
		{ name: "А. Иванов", role: "guitar" },
		{ name: "Б. Петров", role: "bass" },
	]);
});

test("returns no guesses for non-credit prose", () => {
	expect(
		parseBandcampCredits([
			"Music from the video game VHOLUME\nWritten from January-July 2025\nThanks for listening.",
		]),
	).toEqual([]);
});

test("ignores VHOLUME promotional text and links while keeping its mastering credit", () => {
	expect(
		parseBandcampCredits([
			`Music from the video game VHOLUME
https://store.steampowered.com/app/4131730/VHOLUME/

More beautiful music from Konstantin Schimanowski:
https://trips1.bandcamp.com/

Mastered by Karl Barnes at Loom Sound Studio

Thanks for listening ♥`,
		]),
	).toEqual([{ name: "Karl Barnes", role: "mastering engineer" }]);
});

test("ignores URL syntax without losing linked names or credits beside links", () => {
	expect(
		parseBandcampCredits([
			`https://store.steampowered.com/app/4131730/VHOLUME/
http://example.com/art/music
www.example.com/music
Website: trips1.bandcamp.com
<a href="https://example.com/">https://example.com/</a>
Artwork by <a href="https://example.com/jane">Jane Doe</a>
Mixed by Jane Doe https://example.com/jane
Mixed by Jane Doe (https://example.com/jane)
Mixed by Jane Doe https://example.com/jane. Recorded by will.i.am.
Recorded by will.i.am`,
		]),
	).toEqual([
		{ name: "Jane Doe", role: "artwork" },
		{ name: "Jane Doe", role: "mixing engineer" },
		{ name: "will.i.am", role: "recording engineer" },
	]);
});

test("parses Russian role lists and attaches parenthesized track numbers", () => {
	expect(
		parseBandcampCredits([
			`Голландский Штурвал при участии:
Серёга Паюсов: губная гармошка (1), гитара (1), бас (6)
Денис Звёздов: альт (2, 4, 6)
Паша Набок: орган (7), rhodes piano (8)
Фотография: Мария Екушева`,
		]),
	).toEqual([
		{ name: "Серёга Паюсов", role: "harmonica", trackNumber: 1 },
		{ name: "Серёга Паюсов", role: "guitar", trackNumber: 1 },
		{ name: "Серёга Паюсов", role: "bass", trackNumber: 6 },
		{ name: "Денис Звёздов", role: "viola", trackNumber: 2 },
		{ name: "Денис Звёздов", role: "viola", trackNumber: 4 },
		{ name: "Денис Звёздов", role: "viola", trackNumber: 6 },
		{ name: "Паша Набок", role: "organ", trackNumber: 7 },
		{ name: "Паша Набок", role: "rhodes piano", trackNumber: 8 },
		{ name: "Мария Екушева", role: "photography" },
	]);
});

test("joins wrapped Russian credit lists and normalizes common role text", () => {
	expect(
		parseBandcampCredits([
			`Егор Стариков - голос, гитары, бас, барабаны,
рояль, электроорган, лирика, запись, продакшн
Сергей Мартышкин - труба (5)
Володя Варн - тенор и альт саксофоны (5)`,
		]),
	).toEqual([
		{ name: "Егор Стариков", role: "vocals" },
		{ name: "Егор Стариков", role: "guitar" },
		{ name: "Егор Стариков", role: "bass" },
		{ name: "Егор Стариков", role: "drums" },
		{ name: "Егор Стариков", role: "piano" },
		{ name: "Егор Стариков", role: "electric organ" },
		{ name: "Егор Стариков", role: "lyrics" },
		{ name: "Егор Стариков", role: "recording engineer" },
		{ name: "Егор Стариков", role: "producer" },
		{ name: "Сергей Мартышкин", role: "trumpet", trackNumber: 5 },
		{ name: "Володя Варн", role: "tenor saxophone", trackNumber: 5 },
		{ name: "Володя Варн", role: "alto saxophone", trackNumber: 5 },
	]);
});
