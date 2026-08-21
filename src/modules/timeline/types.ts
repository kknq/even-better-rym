export type RGB = { r: number; g: number; b: number };

export type RoleCanonEntry = { key: string; match: RegExp[] };

export type DiscoType =
	| "album"
	| "live"
	| "single"
	| "ep"
	| "additional"
	| "show";

export type DiscoMarker = { year: number; title: string; type: DiscoType };

export type MarkersByType = {
	album: DiscoMarker[];
	live: DiscoMarker[];
	single: DiscoMarker[];
	ep: DiscoMarker[];
	additional: DiscoMarker[];
	show: DiscoMarker[];
};

export type Stint = { start: number; end: number };

export type Member = {
	name: string;
	roles: string[];
	stints: Stint[];
	raw: string;
	url?: string;
	title?: string;
	startYear?: number | null;
	endYear?: number | null;
};

export type EnrichedMember = { member: Member; canons: Set<string> };

export type ParsedMembers = {
	members: Member[];
	maxYearMentioned: number | null;
};

export type Bounds = {
	formedDate: Date | null;
	disbandedDate: Date | null;
	formedLabel?: string;
	disbandedLabel?: string;
};

export type GraphOpts = {
	formedYear?: number | null;
	endYear?: number | null;
	disbandedYear?: number | null;
	axisStartLabel?: string;
	axisEndLabel?: string;
	markers?: MarkersByType;
};
