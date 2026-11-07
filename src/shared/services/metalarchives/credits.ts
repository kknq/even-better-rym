import { normalizeCreditRole } from "../credit-roles";
import type { Track, TrackCredit, UnverifiedCredit } from "../types";

type PersonnelCategory = "lineup" | "guest" | "misc" | "unknown";
export type MetalArchivesPerson = {
	name: string;
	url?: string;
	category: PersonnelCategory;
	sourceRole: string;
};

const CATEGORY_LABELS = new Map<string, PersonnelCategory>([
	["band members", "lineup"],
	["guest/session", "guest"],
	["miscellaneous staff", "misc"],
]);
const CLOSING_BRACKETS = new Map([
	[")", "("],
	["]", "["],
]);

const text = (element: Element): string =>
	element.textContent?.replace(/\s+/g, " ").trim() ?? "";

const parsePerson = (
	row: Element,
	category: PersonnelCategory,
): MetalArchivesPerson => {
	const cells = row.querySelectorAll("td");
	const person = cells[0];
	const role = cells[1];
	if (!person || !role) throw new Error("Malformed Metal Archives lineup row");
	const links = [...person.querySelectorAll("a[href]")].map((anchor) => ({
		anchor,
		url: new URL(
			anchor.getAttribute("href") ?? "",
			"https://www.metal-archives.com",
		),
	}));
	const link = links.find(
		({ url }) =>
			url.origin === "https://www.metal-archives.com" &&
			/^\/artists\/[^/]+\/\d+\/?$/.test(url.pathname),
	);
	const name = text(link?.anchor ?? person);
	if (!name) throw new Error("Metal Archives lineup artist has no name");
	return {
		name,
		category,
		sourceRole: text(role),
		...(link ? { url: link.url.href } : {}),
	};
};

const getCompletePersonnel = (complete: Element): MetalArchivesPerson[] => {
	let category: PersonnelCategory = "unknown";
	const personnel: MetalArchivesPerson[] = [];
	for (const row of complete.querySelectorAll(
		"tr.lineupHeaders, tr.lineupRow",
	)) {
		if (row.classList.contains("lineupHeaders")) {
			category = CATEGORY_LABELS.get(text(row).toLowerCase()) ?? "unknown";
		} else {
			personnel.push(parsePerson(row, category));
		}
	}
	return personnel;
};

export function getReleasePersonnel(
	document_: Document,
): MetalArchivesPerson[] {
	const complete = document_.querySelector(
		"#album_tabs_lineup #album_all_members_lineup",
	);
	if (!complete)
		throw new Error("Metal Archives release lineup is unavailable");
	return getCompletePersonnel(complete);
}

const splitRoles = (source: string): string[] | undefined => {
	const parts: string[] = [];
	const brackets: string[] = [];
	let start = 0;
	for (let index = 0; index < source.length; index++) {
		const character = source[index];
		if ("([".includes(character)) brackets.push(character);
		const expected = CLOSING_BRACKETS.get(character);
		if (expected && brackets.pop() !== expected) return undefined;
		if (",;".includes(character) && brackets.length === 0) {
			parts.push(source.slice(start, index).trim());
			start = index + 1;
		}
	}
	if (brackets.length) return undefined;
	parts.push(source.slice(start).trim());
	return parts.every(Boolean) ? parts : undefined;
};

const normalizeRole = (role: string): string =>
	normalizeCreditRole(
		role.replace(/^vocals\s*\((backing|background|lead)\)$/i, "$1 vocals"),
	);

const getPositionIndexes = (tracks: Track[]): Map<string, number[]> => {
	const positions = new Map<string, number[]>();
	for (const [index, track] of tracks.entries()) {
		if (track.header || !track.position) continue;
		const key = track.position.toUpperCase();
		const indexes = positions.get(key) ?? [];
		indexes.push(index);
		positions.set(key, indexes);
	}
	return positions;
};

const resolveScopeToken = (
	token: string,
	positions: Map<string, number[]>,
): number[] | undefined => {
	const match = /^\s*([A-Z]?)(\d+)(?:\s*[-–]\s*([A-Z]?)(\d+))?\s*$/i.exec(
		token,
	);
	if (!match) return undefined;
	const prefix = match[1].toUpperCase();
	if (match[3] !== undefined && match[3].toUpperCase() !== prefix)
		return undefined;
	const first = Number(match[2]);
	const last = Number(match[4] ?? match[2]);
	if (
		!Number.isSafeInteger(first) ||
		!Number.isSafeInteger(last) ||
		first > last ||
		last - first >= positions.size
	)
		return undefined;
	let previous = -1;
	const indexes: number[] = [];
	for (let position = first; position <= last; position++) {
		const matches = positions.get(`${prefix}${position}`);
		if (matches?.length !== 1 || matches[0] <= previous) return undefined;
		previous = matches[0];
		indexes.push(matches[0]);
	}
	return indexes;
};

const resolveScope = (
	scope: string,
	positions: Map<string, number[]>,
): number[] | undefined => {
	const indexes = new Set<number>();
	const tokens = scope.replace(/\s*(?:\band\b|&)\s*/gi, ",").split(",");
	for (const token of tokens) {
		const matches = resolveScopeToken(token, positions);
		if (!matches) return undefined;
		for (const index of matches) indexes.add(index);
	}
	return indexes.size ? [...indexes] : undefined;
};

const parseRoleScope = (
	sourceRole: string,
	positions: Map<string, number[]>,
): { role: string; indexes?: number[]; releaseWide?: boolean } => {
	const scopedRole = sourceRole.replace(
		/([([])([^()[\]]+),\s*(tracks?\s+[^()[\]]+)([)\]])\s*$/i,
		"$1$2$4 ($3)",
	);
	const match =
		/^(.*?)\s*[([]\s*(?:(?:tracks?)\s+)?(\d[^()[\]]*|[A-Z]\d[^()[\]]*)[)\]]\s*$/i.exec(
			scopedRole,
		);
	if (!match)
		return {
			role: normalizeRole(sourceRole),
			releaseWide: !/\b(?:tracks?|dis[ck]s?|sides?)\b|[([]\s*[A-Z]?\d/i.test(
				sourceRole,
			),
		};
	if (/\btracks?\b/i.test(match[1])) return { role: normalizeRole(sourceRole) };
	const role = match[1].trim();
	const indexes = resolveScope(match[2], positions);
	if (!role || !indexes) return { role: normalizeRole(sourceRole) };
	return { role: normalizeRole(role), indexes };
};

const addUnique = <T extends TrackCredit | UnverifiedCredit>(
	target: T[],
	credit: T,
): void => {
	if (
		!target.some(
			(existing) =>
				existing.name === credit.name && existing.role === credit.role,
		)
	)
		target.push(credit);
};

export function getMetalArchivesCredits(
	document_: Document,
	tracks: Track[],
): {
	trackCredits: TrackCredit[][];
	releaseCredits: TrackCredit[];
	unverifiedCredits: UnverifiedCredit[];
} {
	const trackCredits = tracks.map((): TrackCredit[] => []);
	const releaseCredits: TrackCredit[] = [];
	const unverifiedCredits: UnverifiedCredit[] = [];
	const positions = getPositionIndexes(tracks);
	for (const person of getReleasePersonnel(document_)) {
		const roles = splitRoles(person.sourceRole);
		if (!roles) {
			addUnique(unverifiedCredits, {
				name: person.name,
				...(person.sourceRole
					? { role: normalizeRole(person.sourceRole) }
					: {}),
			});
			continue;
		}
		for (const sourceRole of roles) {
			const { role, indexes, releaseWide } = parseRoleScope(
				sourceRole,
				positions,
			);
			const credit = { name: person.name, role };
			if (releaseWide) {
				addUnique(releaseCredits, credit);
				continue;
			}
			if (!indexes) {
				addUnique(unverifiedCredits, credit);
				continue;
			}
			for (const index of indexes) addUnique(trackCredits[index], credit);
		}
	}
	return { trackCredits, releaseCredits, unverifiedCredits };
}
