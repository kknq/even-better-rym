import { canonicalRole } from "./roles";
import type { EnrichedMember, Member, ParsedMembers, Stint } from "./types";
import { normalizeDashes, sanitizeRoles } from "./utils";

function parseYearToken(token: string): Stint | null {
	const normalizedToken = normalizeDashes(token).trim();

	if (/^\d{4}$/.test(normalizedToken)) {
		const year = Number.parseInt(normalizedToken, 10);
		return { start: year, end: year };
	}

	const matches = /^(\d{4})\s*-\s*(present|\d{2}|\d{4}|\?)$/i.exec(
		normalizedToken,
	);
	if (matches) {
		const start = Number.parseInt(matches[1], 10);
		let end: number;
		const stintEnd = matches[2].toLowerCase();
		if (stintEnd === "present") end = Number.POSITIVE_INFINITY;
		else if (stintEnd === "?")
			end = Number.NaN; // unknown - resolved after all members are parsed
		else if (stintEnd.length === 2)
			end = Math.floor(start / 100) * 100 + Number.parseInt(stintEnd, 10);
		else end = Number.parseInt(stintEnd, 10);
		return { start, end };
	}

	return null;
}

// Classify parenthesized tokens into year stints and role strings
function classifyTokens(tokens: string[]): {
	stints: Stint[];
	roles: string[];
	maxEnd: number | null;
} {
	const stints: Stint[] = [];
	const roles: string[] = [];
	let maxEnd: number | null = null;

	for (const token of tokens) {
		const stint = parseYearToken(token);
		if (stint) {
			stints.push(stint);
			if (Number.isFinite(stint.end))
				maxEnd = Math.max(maxEnd ?? stint.end, stint.end);
		} else {
			roles.push(token);
		}
	}

	return { stints, roles, maxEnd };
}

// Merge a parsed member entry into the accumulator map
function mergeIntoMemberMap(
	memberMap: Map<string, Member>,
	name: string,
	inside: string,
	stints: Stint[],
	cleanRoles: string[],
	urlsByName?: Map<string, string>,
	titlesByName?: Map<string, string>,
): void {
	const member = memberMap.get(name) ?? {
		name,
		roles: [],
		stints: [],
		raw: `${name} (${inside})`,
		url: urlsByName?.get(name),
		title: titlesByName?.get(name),
	};
	if (!member.url && urlsByName?.has(name)) {
		member.url = urlsByName.get(name);
	}

	for (const role of cleanRoles) {
		if (!member.roles.includes(role)) member.roles.push(role);
	}

	for (const stint of stints) {
		if (
			!member.stints.some(
				(existingStint) =>
					existingStint.start === stint.start &&
					existingStint.end === stint.end,
			)
		) {
			member.stints.push(stint);
		}
	}

	memberMap.set(name, member);
}

/** Returns the earliest start year among `others` that share a role and started after `startYear`. */
function earliestCompatibleSuccessor(
	startYear: number,
	myCanons: Set<string>,
	others: EnrichedMember[],
): number {
	let min = Number.POSITIVE_INFINITY;
	for (const { canons, member } of others) {
		if (![...myCanons].some((r) => canons.has(r))) continue;
		for (const s of member.stints) {
			if (s.start > startYear) min = Math.min(min, s.start);
		}
	}
	return min;
}

/**
 * For each stint with an unknown end (NaN), find the earliest start year
 * among other members who share at least one canonical role and joined
 * *after* this member's own start year.  Falls back to Infinity (present)
 * if no such successor exists.
 */
function resolveUnknownEnds(members: Member[]): void {
	const enrichedMembers: EnrichedMember[] = members.map((member) => ({
		member: member,
		canons: new Set(member.roles.map(canonicalRole)),
	}));

	for (const { member, canons } of enrichedMembers) {
		const others = enrichedMembers.filter(
			(enrichedMember) => enrichedMember.member !== member,
		);
		for (const stint of member.stints) {
			if (!Number.isNaN(stint.end)) continue;
			stint.end = earliestCompatibleSuccessor(stint.start, canons, others);
		}
	}
}

export function parseMembersFromText(
	text: string,
	domElement?: HTMLElement | null,
): ParsedMembers {
	const sourceString = (text || "").replaceAll(/\s+/g, " ").trim();
	const regExp = /([^()]+?)\s*\(([^)]*)\)\s*(?:,|$)/g;

	const urlsByName = new Map<string, string>();
	const titlesByName = new Map<string, string>();
	if (domElement) {
		for (const link of domElement.querySelectorAll<HTMLAnchorElement>(
			"a.artist",
		)) {
			const name = (link.textContent ?? "").trim();
			const href = link.getAttribute("href");
			const title = link.getAttribute("title")?.trim();
			if (name && href) urlsByName.set(name, href);
			if (name && title) titlesByName.set(name, title);
		}
	}

	const memberMap = new Map<string, Member>();
	let maxYearMentioned: number | null = null;

	let member: RegExpExecArray | null = null;
	while ((member = regExp.exec(sourceString)) !== null) {
		const name = (member[1] || "").trim();
		const memberData = (member[2] || "").trim();
		if (!name) continue;

		const tokens = memberData
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const { stints, roles, maxEnd } = classifyTokens(tokens);

		if (maxEnd !== null)
			maxYearMentioned = Math.max(maxYearMentioned ?? maxEnd, maxEnd);

		mergeIntoMemberMap(
			memberMap,
			name,
			memberData,
			stints,
			sanitizeRoles(roles),
			urlsByName,
			titlesByName,
		);
	}

	const members = Array.from(memberMap.values());
	resolveUnknownEnds(members);
	return { members, maxYearMentioned };
}
