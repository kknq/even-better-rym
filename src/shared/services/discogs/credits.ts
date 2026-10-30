import { normalizeCreditRole } from "../credit-roles";
import type { TrackCredit, UnverifiedCredit } from "../types";
import { stripDiscogsArtistDisambiguator } from "./artist-name";
import type { ExtraArtist, TrackItem } from "./codec";

const getName = (artist: ExtraArtist): string => {
	if (typeof artist.anv === "string" && artist.anv.trim())
		return stripDiscogsArtistDisambiguator(artist.anv);
	return stripDiscogsArtistDisambiguator(artist.name);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const splitRoles = (value: string): string[] => {
	if (!value.trim()) return [];
	const roles: string[] = [];
	let depth = 0;
	let start = 0;
	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		if (character === "[") depth += 1;
		if (character === "]") {
			depth -= 1;
			if (depth < 0) throw new Error("Malformed Discogs credit role");
		}
		if (character === "," && depth === 0) {
			roles.push(value.slice(start, index).trim());
			start = index + 1;
		}
	}
	if (depth !== 0) throw new Error("Malformed Discogs credit role");
	roles.push(value.slice(start).trim());
	if (roles.some((role) => !role))
		throw new Error("Malformed Discogs credit role");
	return roles;
};

const parseExtraArtists = (value: unknown): ExtraArtist[] => {
	if (!Array.isArray(value)) throw new Error("Malformed Discogs extra artists");
	return value.map((value: unknown) => {
		if (
			!isRecord(value) ||
			typeof value.name !== "string" ||
			("role" in value && typeof value.role !== "string") ||
			("anv" in value && typeof value.anv !== "string") ||
			("tracks" in value && typeof value.tracks !== "string")
		) {
			throw new Error("Malformed Discogs extra artist");
		}
		return {
			name: value.name,
			...(typeof value.role === "string" ? { role: value.role } : {}),
			...(typeof value.anv === "string" ? { anv: value.anv } : {}),
			...(typeof value.tracks === "string" ? { tracks: value.tracks } : {}),
		};
	});
};

const addUnverifiedCredit = (
	target: UnverifiedCredit[],
	name: string,
	role?: string,
) => {
	if (!target.some((credit) => credit.name === name && credit.role === role)) {
		target.push({ name, ...(role ? { role } : {}) });
	}
};

const addCredits = (
	target: TrackCredit[],
	artists: ExtraArtist[],
	unverifiedCredits: UnverifiedCredit[],
) => {
	for (const artist of artists) {
		const name = getName(artist);
		if (!name) throw new Error("Malformed Discogs credit name");
		const sourceRoles = artist.role ? splitRoles(artist.role) : [];
		if (!sourceRoles.length) {
			addUnverifiedCredit(unverifiedCredits, name);
			continue;
		}
		for (const sourceRole of sourceRoles) {
			const role = normalizeCreditRole(sourceRole);
			if (
				!target.some((credit) => credit.name === name && credit.role === role)
			) {
				target.push({ name, role });
			}
		}
	}
};

const getTrackIndexes = (
	positions: string,
	tracklist: TrackItem[],
	positionIndexes: Map<string, number[]>,
): number[] | undefined => {
	const tokens = positions.split(",").map((position) => position.trim());
	if (tokens.some((position) => !position)) return undefined;
	const indexes = new Set<number>();
	for (const token of tokens) {
		const range = /^(.+?)\s+to\s+(.+)$/i.exec(token);
		if (!range) {
			const match = positionIndexes.get(token);
			if (match?.length !== 1) return undefined;
			indexes.add(match[0]);
			continue;
		}
		const start = positionIndexes.get(range[1]?.trim() ?? "");
		const end = positionIndexes.get(range[2]?.trim() ?? "");
		if (start?.length !== 1 || end?.length !== 1) return undefined;
		const first = start[0];
		const last = end[0];
		if (first === undefined || last === undefined || first > last)
			return undefined;
		for (let index = first; index <= last; index += 1) {
			const track = tracklist[index];
			if (track?.type_ !== "track") continue;
			if (positionIndexes.get(track.position)?.length !== 1) return undefined;
			indexes.add(index);
		}
	}
	return indexes.size ? [...indexes] : undefined;
};

export function getDiscogsCredits(
	tracklist: TrackItem[],
	releaseExtraArtists?: unknown,
): { trackCredits: TrackCredit[][]; unverifiedCredits: UnverifiedCredit[] } {
	const credits = tracklist.map((): TrackCredit[] => []);
	const unverifiedCredits: UnverifiedCredit[] = [];
	const positionIndexes = new Map<string, number[]>();
	const releaseIndexes = tracklist.flatMap((track, index) =>
		track.type_ === "track" ? [index] : [],
	);
	for (const [index, track] of tracklist.entries()) {
		if (track.type_ !== "track" || !track.position.trim()) continue;
		const indexes = positionIndexes.get(track.position) ?? [];
		indexes.push(index);
		positionIndexes.set(track.position, indexes);
		if (track.extraartists !== undefined)
			addCredits(
				credits[index] ?? [],
				parseExtraArtists(track.extraartists),
				unverifiedCredits,
			);
	}

	if (releaseExtraArtists === undefined)
		return { trackCredits: credits, unverifiedCredits };
	for (const artist of parseExtraArtists(releaseExtraArtists)) {
		const name = getName(artist);
		if (!name) throw new Error("Malformed Discogs credit name");
		const sourceRoles = artist.role ? splitRoles(artist.role) : [];
		const indexes = artist.tracks?.trim()
			? getTrackIndexes(artist.tracks, tracklist, positionIndexes)
			: releaseIndexes.length
				? releaseIndexes
				: undefined;
		if (!sourceRoles.length) {
			addUnverifiedCredit(unverifiedCredits, name);
			continue;
		}
		for (const sourceRole of sourceRoles) {
			const role = normalizeCreditRole(sourceRole);
			if (!indexes) {
				addUnverifiedCredit(unverifiedCredits, name, role);
				continue;
			}
			for (const index of indexes) {
				const trackCredits = credits[index];
				if (!trackCredits) continue;
				if (
					!trackCredits.some(
						(credit) => credit.name === name && credit.role === role,
					)
				) {
					trackCredits.push({ name, role });
				}
			}
		}
	}
	return { trackCredits: credits, unverifiedCredits };
}
