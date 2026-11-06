import { canonicalRole } from "./roles";
import type { EnrichedMember, Member, ParsedMembers, Stint } from "./types";
import { normalizeDashes, sanitizeRoles } from "./utils";

function parseYearToken(token: string): Stint | null {
	const normalizedToken = normalizeDashes(token).trim();

	if (/^\d{4}$/.test(normalizedToken)) {
		const year = Number.parseInt(normalizedToken, 10);
		return { start: year, end: year };
	}

	const matches = /^(\d{4}|\?)\s*-\s*(present|\d{2}|\d{4}|\?)$/i.exec(
		normalizedToken,
	);
	if (matches) {
		const start = Number.parseInt(matches[1], 10);
		let end: number;
		const stintEnd = matches[2].toLowerCase();
		if (stintEnd === "present") end = Number.POSITIVE_INFINITY;
		else if (stintEnd === "?")
			end = Number.NaN; // unknown - estimated against the graph bounds
		else if (stintEnd.length === 2 && Number.isFinite(start))
			end = Math.floor(start / 100) * 100 + Number.parseInt(stintEnd, 10);
		else if (stintEnd.length === 2) return null;
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
					Object.is(existingStint.start, stint.start) &&
					Object.is(existingStint.end, stint.end),
			)
		) {
			member.stints.push(stint);
		}
	}

	memberMap.set(name, member);
}

/** Resolve against original dates only, so estimates cannot cascade between members. */
export function estimateMemberStints(
	members: Member[],
	axisMin: number,
	axisMax: number,
): Member[] {
	const enrichedMembers: EnrichedMember[] = members.map((member) => ({
		member,
		canons: new Set(member.roles.map(canonicalRole)),
	}));

	return enrichedMembers.map(({ member, canons }) => {
		const others = enrichedMembers.filter(
			(other) =>
				other.member !== member &&
				[...canons].some(
					(role) =>
						role !== "vocals" &&
						role !== "backing vocals" &&
						other.canons.has(role),
				),
		);
		const stints = member.stints.length
			? member.stints
			: [{ start: Number.NaN, end: Number.POSITIVE_INFINITY }];
		return {
			...member,
			stints: stints.map((stint, index): Stint => {
				const result = { ...stint };
				const previousEnds = stints
					.slice(0, index)
					.map((previous) => previous.end)
					.filter(Number.isFinite);
				const lowerBound = Math.max(axisMin, ...previousEnds);
				const upperBound = Number.isFinite(stint.end)
					? Math.min(axisMax, stint.end)
					: axisMax;
				if (Number.isNaN(stint.start)) {
					const candidates = others.flatMap(({ member: other }) =>
						other.stints
							.map((otherStint) => otherStint.end)
							.filter(
								(end) =>
									Number.isFinite(end) &&
									end >= lowerBound &&
									end <= upperBound,
							),
					);
					const unique = [...new Set(candidates)];
					result.start = unique.length === 1 ? unique[0] : lowerBound;
					// Preserve the existing full-span behavior for wholly undated members
					// unless a dated role handoff provides evidence for a later start.
					if (member.stints.length || unique.length === 1) {
						result.startEstimate =
							unique.length === 1
								? `Start estimated at ${result.start} from a same-role departure; overlap is possible.`
								: `Start unknown; possible from ${lowerBound} to ${upperBound}.`;
					}
				}
				if (Number.isNaN(stint.end)) {
					const nextStart = stints[index + 1]?.start;
					const upperEnd =
						nextStart != null && Number.isFinite(nextStart)
							? Math.min(axisMax, nextStart)
							: axisMax;
					const candidates = others.flatMap(({ member: other }) =>
						other.stints
							.map((otherStint) => otherStint.start)
							.filter(
								(start) =>
									Number.isFinite(start) &&
									start > result.start &&
									start <= upperEnd,
							),
					);
					const unique = [...new Set(candidates)];
					result.end = unique.length === 1 ? unique[0] : upperEnd;
					result.endEstimate =
						unique.length === 1
							? `End estimated at ${result.end} from a same-role arrival; overlap is possible.`
							: `End unknown; possible from ${result.start} to ${upperEnd}. Not confirmed present.`;
				}
				return result;
			}),
		};
	});
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

	let members = Array.from(memberMap.values());
	if (!members.length && sourceString) {
		for (const name of sourceString
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean)) {
			mergeIntoMemberMap(memberMap, name, "", [], [], urlsByName, titlesByName);
		}
		members = Array.from(memberMap.values());
	}

	return { members, maxYearMentioned };
}
