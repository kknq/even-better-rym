import type { Member, ParsedMembers, Stint } from "./types";
import { normalizeDashes, sanitizeRoles } from "./utils";

function parseYearToken(token: string): Stint | null {
	const normalizedToken = normalizeDashes(token).trim();
	const curYear = new Date().getFullYear();

	if (/^\d{4}$/.test(normalizedToken)) {
		const y = Number.parseInt(normalizedToken, 10);
		return { start: y, end: y };
	}

	const m = /^(\d{4})\s*-\s*(present|\d{2}|\d{4})$/i.exec(normalizedToken);
	if (m) {
		const start = Number.parseInt(m[1], 10);
		let end: number;
		const rhs = m[2].toLowerCase();
		if (rhs === "present") end = curYear;
		else if (rhs.length === 2)
			end = Math.floor(start / 100) * 100 + Number.parseInt(rhs, 10);
		else end = Number.parseInt(rhs, 10);
		return { start, end };
	}

	return null;
}

// Classify parenthesised tokens into year stints and role strings
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
): void {
	const member = memberMap.get(name) ?? {
		name,
		roles: [],
		stints: [],
		raw: `${name} (${inside})`,
	};

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

export function parseMembersFromText(text: string): ParsedMembers {
	const sourceString = (text || "").replaceAll(/\s+/g, " ").trim();
	const regExp = /([^()]+?)\s*\(([^)]*)\)\s*(?:,|$)/g;

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
		);
	}

	return { members: Array.from(memberMap.values()), maxYearMentioned };
}
