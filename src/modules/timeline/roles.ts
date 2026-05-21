import type { RoleCanonEntry } from "./types";

// --------------------------
// Role canonicalization
// e.g. "vox" and "vocal" → "vocals", "synth" → "keyboards", etc.
// --------------------------

export const ROLE_CANON: RoleCanonEntry[] = [
	// --- Vocals ---
	{ key: "vocals", match: [/^vocals?$/i] },
	{
		key: "backing vocals",
		match: [/^backing vocals?$/i, /background vocals?/i],
	},
	{ key: "rap", match: [/^rap$/i, /rapper/i] },

	// --- Guitar ---
	{ key: "guitar", match: [/^guitar$/i, /lead guitar/i] },
	{ key: "rhythm guitar", match: [/^rhythm guitar$/i] },
	{ key: "bass", match: [/^bass$/i, /bass guitar/i] },
	{ key: "piccolo bass", match: [/^piccolo bass$/i] },

	// --- Keyboards ---
	{ key: "keyboards", match: [/^keyboards?$/i] },
	{ key: "piano", match: [/^piano$/i] },
	{ key: "toy piano", match: [/^toy piano$/i] },
	{ key: "synthesizer", match: [/^synthesizer$/i, /^synth$/i] },
	{
		key: "analogue synthesizer",
		match: [/analogue synthesizer/i, /analog synthesizer/i],
	},
	{ key: "ondes martenot", match: [/ondes\s*martenot/i] },
	{ key: "sampler", match: [/^sampler$/i] },
	{ key: "laptop", match: [/^laptop$/i] },
	{ key: "glockenspiel", match: [/^glockenspiel$/i] },

	// --- Drums & Percussion ---
	{ key: "drums", match: [/^drums?$/i] },
	{ key: "percussion", match: [/^percussion$/i] },
	{ key: "congas", match: [/^congas?$/i] },
	{ key: "bongos", match: [/^bongos?$/i] },
	{ key: "timbales", match: [/^timbales?$/i] },

	// --- Brass & Woodwinds ---
	{ key: "saxophone", match: [/^saxophone$/i, /\bsax\b/i] },
	{ key: "trumpet", match: [/^trumpet$/i] },
	{ key: "trombone", match: [/^trombone$/i] },
	{ key: "flute", match: [/^flute$/i] },

	// --- Production ---
	{ key: "producer", match: [/^producer$/i] },
	{ key: "orchestration", match: [/orchestration/i] },
	{ key: "effects", match: [/^effects?$/i] },
];

export const KNOWN_ROLES = new Set([
	"keyboards",
	"guitar",
	"rhythm guitar",
	"vocals",
	"backing vocals",
	"congas",
	"drums",
	"timbales",
	"saxophone",
	"bongos",
	"flute",
	"piccolo bass",
	"bass",
	"trumpet",
	"trombone",
	"percussion",
	"rap",
	"producer",
	"piano",
	"toy piano",
	"analogue synthesizer",
	"ondes martenot",
	"laptop",
	"glockenspiel",
	"orchestration",
	"effects",
	"synthesizer",
	"sampler",
]);

export function canonicalRole(role: string): string {
	const canonRole = (role || "").trim().toLowerCase();
	for (const entry of ROLE_CANON) {
		if (entry.match.some((rx) => rx.test(canonRole))) return entry.key;
	}
	return canonRole;
}

export function capitalizeWords(string: string): string {
	return String(string)
		.split(/\s+/)
		.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function roleToCssVarKey(canonKey: string): string {
	return `--rymmt-role-${canonKey.replaceAll(/\s+/g, "-")}`;
}

export function getRoleColor(role: string, isDarkTheme: boolean): string {
	const key = canonicalRole(role);

	if (KNOWN_ROLES.has(key)) {
		return `var(${roleToCssVarKey(key)})`;
	}

	// Unknown roles: deterministic hash → HSL
	let h = 0;
	for (let i = 0; i < key.length; i++)
		h = (h * 31 + (key.codePointAt(i) ?? 0)) >>> 0;
	const hue = h % 360;
	const sat = isDarkTheme ? 70 : 65;
	const light = isDarkTheme ? 45 : 40;
	return `hsl(${hue} ${sat}% ${light}%)`;
}
