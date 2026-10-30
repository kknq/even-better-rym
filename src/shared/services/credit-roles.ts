const ROLE_NAMES = new Map([
	["songwriter", "songwriting"],
	["writer", "writer"],
	["author", "songwriting"],
	["composer", "composer"],
	["composerlyricist", "songwriting"],
	["rapvocalist", "rap"],
	["lyricist", "lyrics"],
	["producer", "producer"],
	["coproducer", "co-producer"],
	["executiveproducer", "executive producer"],
	["mixingengineer", "mixing engineer"],
	["masteringengineer", "mastering engineer"],
	["masteredby", "mastering engineer"],
	["recordingengineer", "recording engineer"],
	["recordedby", "recording engineer"],
	["mixedby", "mixing engineer"],
	["writtenby", "writer"],
	["remix", "remixer"],
	["lacquercutby", "lacquer cut"],
	["artworkby", "artwork"],
	["engineer", "engineer"],
	["assistantengineer", "assistant engineer"],
	["vocals", "vocals"],
	["backgroundvocals", "backing vocals"],
	["leadvocals", "lead vocals"],
	["featuredartist", "featured"],
	["featuring", "featured"],
]);

export const matchCreditRole = (role: string): string | undefined => {
	const normalized = role.replaceAll("_", " ").trim().toLowerCase();
	return ROLE_NAMES.get(normalized.replace(/[\s-]+/g, ""));
};

export const normalizeCreditRole = (role: string): string =>
	matchCreditRole(role) ?? role.replaceAll("_", " ").trim().toLowerCase();
