import { expect, test } from "vitest";
import { normalizeCreditRole } from "./credit-roles";

test.each([
	["Songwriter", "songwriting"],
	["Composer", "composition"],
	["Lyricist", "lyrics"],
	["Producer", "producer"],
	["Co-Producer", "co-producer"],
	["Executive Producer", "executive producer"],
	["Mixing Engineer", "mixing"],
	["Mastering Engineer", "mastering"],
	["Recording Engineer", "recording engineer"],
	["Engineer", "engineer"],
	["Assistant Engineer", "assistant engineer"],
	["Vocals", "vocals"],
	["Background Vocals", "backing vocals"],
	["Lead Vocals", "lead vocals"],
	["Featured Artist", "featured"],
	["composer", "composition"],
	[" AUTHOR ", "songwriting"],
	["writer", "songwriting"],
	["featuring", "featured"],
	["featured_artist", "featured"],
	["mixingengineer", "mixing"],
	["masteringengineer", "mastering"],
	["recordingengineer", "recording engineer"],
	["Mixing_Engineer", "mixing"],
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
