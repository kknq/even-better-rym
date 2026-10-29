const ROLE_NAMES: Record<string, string> = {
	Songwriter: "songwriting",
	Composer: "composition",
	Lyricist: "lyrics",
	Producer: "producer",
	"Co-Producer": "co-producer",
	"Executive Producer": "executive producer",
	"Mixing Engineer": "mixing",
	"Mastering Engineer": "mastering",
	"Recording Engineer": "recording engineer",
	Engineer: "engineer",
	"Assistant Engineer": "assistant engineer",
	Vocals: "vocals",
	"Background Vocals": "backing vocals",
	"Lead Vocals": "lead vocals",
	"Featured Artist": "featured",
};

export const normalizeCreditRole = (role: string): string => {
	const trimmed = role.trim();
	const normalized = ROLE_NAMES[trimmed];
	return typeof normalized === "string" ? normalized : trimmed.toLowerCase();
};
