import type { RoleCanonEntry } from "./types";

// --------------------------
// Role canonicalization
// e.g. "vox" and "vocal" → "vocals", "synth" → "keyboards", etc.
// --------------------------

export const ROLE_CANON: RoleCanonEntry[] = [
	// --- Vocals ---
	{
		key: "vocals",
		match: [/^vocals?$/i, /^lead vocals?$/i, /^rap$/i, /rapper/i],
	},
	{
		key: "backing vocals",
		match: [/^backing vocals?$/i, /background vocals?/i],
	},

	// --- Guitar & Strings ---
	{ key: "guitar", match: [/^guitar$/i, /lead guitar/i] },
	{ key: "rhythm guitar", match: [/^rhythm guitar$/i] },
	{ key: "bass", match: [/^bass$/i, /bass guitar/i] },
	{ key: "double bass", match: [/^double bass$/i] },
	{ key: "piccolo bass", match: [/^piccolo bass$/i] },
	{ key: "lap steel", match: [/^lap steel$/i] },
	{ key: "lap steel guitar", match: [/^lap steel guitar$/i] },
	{ key: "dulcimer", match: [/^dulcimer$/i] },
	{ key: "hammered dulcimer", match: [/^hammered dulcimer$/i] },
	{ key: "viola", match: [/^viola$/i] },
	{ key: "cello", match: [/^cello$/i] },
	{ key: "violin", match: [/^violin$/i] },

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
	{ key: "electronic organ", match: [/^electronic organ$/i] },
	{ key: "organ", match: [/^organ$/i] },
	{ key: "mellotron", match: [/^mellotron$/i] },
	{ key: "glockenspiel", match: [/^glockenspiel$/i] },

	// --- Drums & Percussion ---
	{ key: "drums", match: [/^drums?$/i] },
	{ key: "percussion", match: [/^percussion$/i] },
	{ key: "congas", match: [/^congas?$/i] },
	{ key: "bongos", match: [/^bongos?$/i] },
	{ key: "timbales", match: [/^timbales?$/i] },
	{ key: "bells", match: [/^bells?$/i] },
	{ key: "vibraphone", match: [/^vibraphone$/i] },

	// --- Brass & Woodwinds ---
	{ key: "saxophone", match: [/^saxophone$/i, /\bsax\b/i] },
	{ key: "trumpet", match: [/^trumpet$/i] },
	{ key: "trombone", match: [/^trombone$/i] },
	{ key: "french horn", match: [/^french horn$/i] },
	{ key: "flute", match: [/^flute$/i] },
	{ key: "harmonica", match: [/^harmonica$/i] },
	{ key: "melodica", match: [/^melodica$/i] },
	{ key: "jew's harp", match: [/^jew(')?s harp$/i] },
	{ key: "winds", match: [/^winds?$/i] },

	// --- Production ---
	{ key: "producer", match: [/^producer$/i] },
	{ key: "orchestration", match: [/orchestration/i] },
	{ key: "effects", match: [/^effects?$/i] },
	{ key: "electronics", match: [/^electronics$/i] },
	{ key: "programming", match: [/^programming$/i] },
	{ key: "tapes", match: [/^tapes?$/i] },
];

export const KNOWN_ROLES = new Set(ROLE_CANON.map((e) => e.key));

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

// ---- Color assignment ----

/**
 * Approximate hue angles (0–359°) of every named CSS-variable role color.
 * Used to seed the occupied-hue set so fallback hues are placed as far as
 * possible from all role colors already present in the chart.
 */
const KNOWN_ROLE_HUES: Readonly<Partial<Record<string, number>>> = {
	// Vocals family - 330°–350°
	vocals: 350,
	"backing vocals": 330,
	// Guitar & Strings family - 85°–142°
	guitar: 142,
	"rhythm guitar": 85,
	"lap steel guitar": 128,
	"lap steel": 135,
	hammered: 115,
	dulcimer: 122,
	viola: 108,
	cello: 100,
	violin: 105,
	// Bass - 215°–221°
	bass: 217,
	"double bass": 219,
	"piccolo bass": 221,
	// Percussion - 0°–70°
	timbales: 0,
	bongos: 21,
	congas: 24,
	drums: 38,
	percussion: 48,
	vibraphone: 60,
	bells: 65,
	glockenspiel: 56,
	// Keyboards - 237°–292°
	laptop: 237,
	electronics: 235,
	electronic: 243,
	synthesizer: 248,
	"analogue synthesizer": 258,
	sampler: 271,
	"ondes martenot": 278,
	keyboards: 270,
	piano: 284,
	"toy piano": 292,
	mellotron: 280,
	organ: 265,
	// Winds & Brass - 160°–203°
	winds: 160,
	"jew's harp": 165,
	melodica: 170,
	flute: 162,
	saxophone: 183,
	harmonica: 175,
	trumpet: 195,
	trombone: 203,
	"french horn": 200,
	// Production - 210°–230°
	tapes: 213,
	producer: 210,
	programming: 225,
	orchestration: 222,
	effects: 230,
};

// Full-circle candidate grid – one entry every 10°.
const CANDIDATE_HUES: readonly number[] = Array.from(
	{ length: 36 },
	(_, i) => i * 10,
);

function hueDist(a: number, b: number): number {
	const diff = Math.abs(a - b) % 360;
	return diff > 180 ? 360 - diff : diff;
}

/**
 * Return the candidate hue whose minimum circular distance to every already-
 * occupied hue is the largest (max-min-distance criterion). This spreads
 * fallback colors as evenly as possible across the full hue circle.
 */
function pickBestHue(occupiedHues: number[]): number {
	let bestHue = 0;
	let bestMinDist = -1;
	for (const candidate of CANDIDATE_HUES) {
		const minDist =
			occupiedHues.length === 0
				? 360
				: Math.min(...occupiedHues.map((hue) => hueDist(candidate, hue)));
		if (minDist > bestMinDist) {
			bestMinDist = minDist;
			bestHue = candidate;
		}
	}
	return bestHue;
}

/**
 * Sort priority so base known roles get their CSS vars before aliases do,
 * preventing e.g. "lead guitar" from stealing `--rymmt-role-guitar`.
 *   0 = base known role (role string IS the canonical key)
 *   1 = known alias   (role canonicalises to a known key but string differs)
 *   2 = unknown role
 */
function roleSortPriority(role: string): number {
	const key = canonicalRole(role);
	if (!KNOWN_ROLES.has(key)) return 2;
	return role.toLowerCase() === key ? 0 : 1;
}

/**
 * Build a per-chart color map guaranteeing every role gets a visually
 * distinct color. Base known roles claim their CSS variable first; aliases
 * (e.g. "lead guitar") and unknowns (e.g. "acoustic guitar") receive hues
 * chosen by maximizing minimum circular distance from all hues already in use,
 * including those of CSS-variable roles present in the current chart.
 */
export function buildChartRoleColorMap(
	roles: string[],
	isDarkTheme: boolean,
): Map<string, string> {
	const saturation = isDarkTheme ? 70 : 65;
	const lightness = isDarkTheme ? 45 : 40;

	// Base known roles first so they claim CSS vars before their aliases do.
	const ordered = [...roles].toSorted((a, b) => {
		const priorityA = roleSortPriority(a);
		const priorityB = roleSortPriority(b);
		const priorityDiff = priorityA - priorityB;
		return priorityDiff === 0 ? a.localeCompare(b) : priorityDiff;
	});

	const result = new Map<string, string>();
	const usedCanonKeys = new Set<string>();
	const occupiedHues: number[] = []; // CSS-var hues + assigned fallback hues

	for (const role of ordered) {
		const canonKey = canonicalRole(role);

		if (KNOWN_ROLES.has(canonKey) && !usedCanonKeys.has(canonKey)) {
			// First occurrence of this canonical key - use its CSS variable.
			result.set(role, `var(${roleToCssVarKey(canonKey)})`);
			usedCanonKeys.add(canonKey);
			// Record the known hue so fallback picks respect it.
			const knownHue = KNOWN_ROLE_HUES[canonKey];
			if (knownHue !== undefined) occupiedHues.push(knownHue);
		} else {
			// Unknown role OR a duplicate canonical key: pick the hue that is
			// furthest (max-min-distance) from all occupied hues.
			const hue = pickBestHue(occupiedHues);
			result.set(role, `hsl(${hue} ${saturation}% ${lightness}%)`);
			occupiedHues.push(hue);
		}
	}

	return result;
}
