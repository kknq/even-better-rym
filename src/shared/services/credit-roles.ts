const ROLE_NAMES = new Map([
	["songwriter", "songwriting"],
	["writer", "songwriting"],
	["author", "songwriting"],
	["composer", "composition"],
	["lyricist", "lyrics"],
	["producer", "producer"],
	["coproducer", "co-producer"],
	["executiveproducer", "executive producer"],
	["mixingengineer", "mixing"],
	["masteringengineer", "mastering"],
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
