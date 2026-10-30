import { normalizeCreditRole } from "../credit-roles";
import type { TrackCredit } from "../types";

const BLOCK_TAGS = new Set([
	"ADDRESS",
	"BLOCKQUOTE",
	"DIV",
	"LI",
	"OL",
	"P",
	"PRE",
	"SECTION",
	"UL",
]);

const ROLE_TRANSLATIONS = new Map([
	["бас", "bass"],
	["барабаны", "drums"],
	["альт", "viola"],
	["artwork", "artwork"],
	["engineered", "engineer"],
	["гитара", "guitar"],
	["гитары", "guitar"],
	["голос", "vocals"],
	["голоса", "vocals"],
	["вокал", "vocals"],
	["губная гармошка", "harmonica"],
	["лирика", "lyrics"],
	["орган", "organ"],
	["рояль", "piano"],
	["электроорган", "electric organ"],
	["запись", "recording engineer"],
	["продакшн", "producer"],
	["production", "producer"],
	["recorded", "recording engineer"],
	["recording", "recording engineer"],
	["mixed", "mixing engineer"],
	["mastered", "mastering engineer"],
	["труба", "trumpet"],
	["тенор и альт саксофоны", "tenor saxophone / alto saxophone"],
	["фотография", "photography"],
	["máster", "mastering engineer"],
	["master", "mastering engineer"],
	["arte de tapa", "artwork"],
]);

export type BandcampCredit = TrackCredit & { trackNumber?: number };

const toLines = (source: string): string[] => {
	const document_ = new DOMParser().parseFromString(source, "text/html");
	let text = "";
	const visit = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent ?? "";
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) {
			for (const child of node.childNodes) visit(child);
			return;
		}
		const element = node as Element;
		if (element.tagName === "BR") {
			text += "\n";
			return;
		}
		const isBlock = BLOCK_TAGS.has(element.tagName);
		if (isBlock && text && !text.endsWith("\n")) text += "\n";
		for (const child of element.childNodes) visit(child);
		if (isBlock && !text.endsWith("\n")) text += "\n";
	};
	for (const child of document_.body.childNodes) visit(child);
	return text
		.replace(
			/\b(?:[a-z][a-z\d+.-]*:\/\/|mailto:|www\.)[^\s<>()[\]]+/gi,
			(url) => /[.,;!?]+$/.exec(url)?.[0] ?? "",
		)
		.replace(/\(\s*\)|\[\s*\]/g, "")
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => line.replace(/^\s*[•*]\s*/, "").trim())
		.filter(Boolean);
};

const cleanName = (name: string): string =>
	name
		.replace(/\s+(?:at|of|in)\s+.+$/i, "")
		.replace(/[.;]+$/, "")
		.trim();

const normalizeBandcampRole = (role: string): string => {
	const trimmed = role.trim();
	return (
		ROLE_TRANSLATIONS.get(trimmed.toLocaleLowerCase()) ??
		normalizeCreditRole(trimmed)
	);
};

const splitRoles = (roles: string): string[] => {
	const parts: string[] = [];
	let part = "";
	let parentheses = 0;
	for (let index = 0; index < roles.length; index += 1) {
		const character = roles[index] ?? "";
		if (character === "(") parentheses += 1;
		if (character === ")") parentheses = Math.max(0, parentheses - 1);
		if (
			parentheses === 0 &&
			(character === "," || character === "/" || character === "&")
		) {
			parts.push(part);
			part = "";
			continue;
		}
		if (parentheses === 0) {
			const conjunction = /^\s+and\s+/i.exec(roles.slice(index));
			if (conjunction) {
				parts.push(part);
				part = "";
				index += conjunction[0].length - 1;
				continue;
			}
		}
		part += character;
	}
	parts.push(part);
	return parts.map((role) => role.trim().replace(/[.;]+$/, "")).filter(Boolean);
};

const splitRoleScope = (
	role: string,
): { role: string; trackNumbers?: number[] } => {
	const match = /\s*\((\d+(?:\s*,\s*\d+)*)\)\s*$/.exec(role);
	if (!match) return { role };
	return {
		role: role.replace(match[0], "").trim(),
		trackNumbers: (match[1] ?? "").split(/\s*,\s*/).map(Number),
	};
};

const makeCredits = (
	nameText: string,
	roleText: string,
	trackNumber?: number,
): BandcampCredit[] => {
	const name = cleanName(nameText);
	if (!name) return [];
	const roleLine = roleText.replace(/^\s*featuring\s+/i, "");
	const trackMatch = /\s+on\s+track\s+(\d+)\b/i.exec(roleLine);
	const parsedTrackNumber =
		trackNumber ?? (trackMatch ? Number(trackMatch[1]) : undefined);
	const roles = splitRoles(
		trackMatch ? roleLine.replace(trackMatch[0], "") : roleLine,
	);
	return roles.flatMap((role) => {
		const scopedRole = splitRoleScope(role);
		const normalizedRoles = splitRoles(
			ROLE_TRANSLATIONS.get(scopedRole.role.toLocaleLowerCase()) ??
				scopedRole.role,
		);
		const trackNumbers =
			scopedRole.trackNumbers ??
			(parsedTrackNumber === undefined ? undefined : [parsedTrackNumber]);
		return normalizedRoles.flatMap((normalizedRole) =>
			(trackNumbers ?? [undefined]).map((number) => ({
				name,
				role: normalizeBandcampRole(normalizedRole),
				...(number === undefined ? {} : { trackNumber: number }),
			})),
		);
	});
};

const parseByLine = (line: string): BandcampCredit[] => {
	const chained = /^(.+?)\s+by\s+(.+?)\s+and\s+(.+?)\s+by\s+(.+)$/i.exec(line);
	if (chained) {
		const firstRoles = (chained[1] ?? "").replace(/\s+at\s+.+$/i, "");
		return [
			...makeCredits(chained[2] ?? "", firstRoles),
			...makeCredits(chained[4] ?? "", chained[3] ?? ""),
		];
	}

	if (
		/^(?:more\b.*\bmusic|music|written|recorded|available)\s+from\b/i.test(line)
	)
		return [];
	const roleByPerson = /^(.+?)\s+(?:by|from)\s+(.+)$/i.exec(line);
	if (!roleByPerson) return [];
	let roles = (roleByPerson[1] ?? "").replace(/\s+at\s+.+$/i, "");
	roles = roles.replace(/^featuring\s+/i, "");
	const trackMatch = /\s+on\s+track\s+(\d+)\b/i.exec(roles);
	const trackNumber = trackMatch ? Number(trackMatch[1]) : undefined;
	if (trackMatch) roles = roles.replace(trackMatch[0], "");
	return makeCredits(roleByPerson[2] ?? "", roles, trackNumber);
};

const parsePersonRoleLine = (line: string): BandcampCredit[] => {
	const parenthesized = /^(.+?)\s*\(([^()]*)\)\s*$/.exec(line);
	if (parenthesized && !/^\d+(?:\s*,\s*\d+)*$/.test(parenthesized[2] ?? "")) {
		return makeCredits(parenthesized[1] ?? "", parenthesized[2] ?? "");
	}
	const colon = /^(.+?):\s*(.+)$/.exec(line);
	if (colon) {
		const nameOrRole = colon[1] ?? "";
		const rolesOrName = colon[2] ?? "";
		const role = ROLE_TRANSLATIONS.get(nameOrRole.trim().toLocaleLowerCase());
		if (role) return makeCredits(rolesOrName, role);
		if (
			/^(?:[\w.+-]+@)?(?:[\w-]+\.)+[a-z]{2,}(?:[/?#]\S*)?$/i.test(rolesOrName)
		)
			return [];
		if (nameOrRole.includes("/")) return [];
		return makeCredits(nameOrRole, rolesOrName);
	}
	const personDashRoles = /^(.+?)\s+[–—-]\s+(.+)$/.exec(line);
	if (personDashRoles) {
		return makeCredits(personDashRoles[1] ?? "", personDashRoles[2] ?? "");
	}
	return [];
};

const parseLine = (line: string): BandcampCredit[] => {
	const byCredits = parseByLine(line);
	return byCredits.length > 0 ? byCredits : parsePersonRoleLine(line);
};

export const parseBandcampCredits = (
	sources: (string | null | undefined)[],
): BandcampCredit[] => {
	const credits = new Map<string, BandcampCredit>();
	for (const source of sources) {
		if (!source) continue;
		const lines = toLines(source).reduce<string[]>((result, line) => {
			const previous = result.at(-1);
			if (previous?.endsWith(",")) {
				result[result.length - 1] = `${previous} ${line}`;
			} else {
				result.push(line);
			}
			return result;
		}, []);
		// Keep initials and common name abbreviations within the same sentence.
		const sentences = lines.flatMap((line) =>
			line.split(
				/(?<!(?:^|[^\p{L}])(?:\p{L}|dr|mr|mrs|ms|st|jr|sr)\.)(?<=[.!?])\s+/iu,
			),
		);
		for (const line of sentences) {
			for (const credit of parseLine(line)) {
				const key = JSON.stringify([
					credit.name,
					credit.role,
					credit.trackNumber,
				]);
				credits.set(key, credit);
			}
		}
	}
	return [...credits.values()];
};
