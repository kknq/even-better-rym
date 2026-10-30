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
	["recordingengineer", "recording engineer"],
	["engineer", "engineer"],
	["assistantengineer", "assistant engineer"],
	["vocals", "vocals"],
	["backgroundvocals", "backing vocals"],
	["leadvocals", "lead vocals"],
	["featuredartist", "featured"],
	["featuring", "featured"],
]);

export const normalizeCreditRole = (role: string): string => {
	const normalized = role.replaceAll("_", " ").trim().toLowerCase();
	return ROLE_NAMES.get(normalized.replace(/[\s-]+/g, "")) ?? normalized;
};
