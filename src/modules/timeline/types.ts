import type { TimelineReleaseType } from "~/shared/release-types";

export type RoleCanonEntry = { key: string; match: RegExp[] };

export type DiscoType = TimelineReleaseType | "show";

export type DiscoMarker = { year: number; title: string; type: DiscoType };

export type MarkersByType = Record<DiscoType, DiscoMarker[]>;

export type Stint = {
	start: number;
	end: number;
	startEstimate?: string;
	endEstimate?: string;
};

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
