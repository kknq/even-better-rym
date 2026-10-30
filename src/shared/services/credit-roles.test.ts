import { expect, test } from "vitest";
import { normalizeCreditRole } from "./credit-roles";

test.each([
	["Songwriter", "songwriting"],
	["Composer", "composer"],
	["ComposerLyricist", "songwriting"],
	["Composer Lyricist", "songwriting"],
	["Lyricist", "lyrics"],
	["Producer", "producer"],
	["Co-Producer", "co-producer"],
	["Executive Producer", "executive producer"],
	["Mixing Engineer", "mixing engineer"],
	["Mastering Engineer", "mastering engineer"],
	["Recording Engineer", "recording engineer"],
	["Engineer", "engineer"],
	["Assistant Engineer", "assistant engineer"],
	["Vocals", "vocals"],
	["Background Vocals", "backing vocals"],
	["Lead Vocals", "lead vocals"],
	["Featured Artist", "featured"],
	["composer", "composer"],
	[" AUTHOR ", "songwriting"],
	["writer", "writer"],
	["Writer", "writer"],
	["RapVocalist", "rap"],
	["Rap Vocalist", "rap"],
	["rap_vocalist", "rap"],
	["RAP-VOCALIST", "rap"],
	["featuring", "featured"],
	["featured_artist", "featured"],
	["mixingengineer", "mixing engineer"],
	["masteringengineer", "mastering engineer"],
	["recordingengineer", "recording engineer"],
	["Mixing_Engineer", "mixing engineer"],
	["Mastering_Engineer", "mastering engineer"],
	["CO_PRODUCER", "co-producer"],
])("normalizes the shared role or source alias %j to %j", (source, expected) => {
	expect(normalizeCreditRole(source)).toBe(expected);
});

test.each([
	["  Custom Role  ", "custom role"],
	["guest_vocals", "guest vocals"],
	["Custom-Role", "custom-role"],
	["constructor", "constructor"],
	["toString", "tostring"],
	["", ""],
])("preserves unknown roles as reviewable text: %j", (source, expected) => {
	expect(normalizeCreditRole(source)).toBe(expected);
});
