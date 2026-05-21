export type RGB = { r: number; g: number; b: number };

export type RoleCanonEntry = { key: string; match: RegExp[] };

export type DiscoMarker = { year: number; title?: string; url?: string };

export type MarkersByType = {
	album: DiscoMarker[];
	live: DiscoMarker[];
	single: DiscoMarker[];
	ep: DiscoMarker[];
};

export type Stint = { start: number; end: number };

export type Member = {
	name: string;
	roles: string[];
	stints: Stint[];
	raw: string;
	startYear?: number | null;
	endYear?: number | null;
};

export type ParsedMembers = {
	members: Member[];
	maxYearMentioned: number | null;
};

export type TimelineMarkers = {
	album: number[];
	live: number[];
	single: number[];
	ep: number[];
};

export type DiscoType = "album" | "live" | "single" | "ep";

export type Bounds = { formedDate: Date | null; disbandedDate: Date | null };

export type GraphOpts = {
	formedYear?: number | null;
	endYear?: number | null;
	disbandedYear?: number | null;
	markers?: MarkersByType;
};
