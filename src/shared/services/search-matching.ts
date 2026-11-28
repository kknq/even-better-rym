import type { ReleaseType, SearchFunction } from "./types";

export const normalizeSearchText = (value: string): string =>
	value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

const stripTerminalPunctuation = (value: string): string => {
	const trimmed = value.trimEnd();
	let end = trimmed.length;
	while (end > 0 && "?.!".includes(trimmed[end - 1])) end--;
	return trimmed.slice(0, end).trimEnd() || trimmed;
};

export const normalizeSearchTitle = (value: string): string =>
	stripTerminalPunctuation(
		normalizeSearchText(value)
			.replace(/\b(?:volume|vol\.?)(?=\s*\d)/g, "vol.")
			.replace(/\s*[:,]\s*(vol\.\s*\d+)\b/g, " $1")
			.replace(/\b(vol\.\s*\d+)\s*(?:[:,]|\s[-–—])\s*/g, "$1 "),
	);

export const getSearchTitleSuffix = (
	candidate: string,
	title: string,
): string => candidate.slice(title.length).replace(/^[?!.]+(?=\s)/, "");

export const isEpTitle = (
	candidate: string,
	title: string,
	releaseType?: ReleaseType | null,
): boolean => {
	if (releaseType !== "ep") return false;
	const withoutLabel = (value: string) =>
		normalizeSearchTitle(value)
			.replace(/(?: -)? ep$/, "")
			.trimEnd();
	const original = withoutLabel(title);
	return original.length > 0 && withoutLabel(candidate) === original;
};

export const getSearchTitleVariants = (
	title: string,
	releaseType?: ReleaseType,
): string[] => {
	const abbreviated = title.replace(/\b(?:volume|vol\.?)(?=\s*\d)/gi, "Vol.");
	const alternate = abbreviated
		.replace(/\s*:\s*(Vol\.\s*\d+)\b/g, ", $1")
		.replace(/\b(Vol\.\s*\d+)\s+[-–—]\s*/g, "$1: ");
	const expanded = abbreviated.replace(/\bVol\.(?=\s*\d)/g, "Volume");
	const expandedAlternate = expanded
		.replace(/\s*,\s*(Volume\s*\d+)\b/g, ": $1")
		.replace(/\b(Volume\s*\d+)\s*:\s*/g, "$1 - ");
	const variants = [title, abbreviated, alternate, expanded, expandedAlternate];
	variants.push(...variants.map(stripTerminalPunctuation));
	if (releaseType === "ep") {
		variants.push(
			...variants.map((variant) =>
				variant.replace(/(?: -)? EP$/i, (label) =>
					label.startsWith(" -") ? " EP" : " - EP",
				),
			),
		);
	}
	return [...new Set(variants)].filter(
		(variant) => variant.length > 0 || variant === title,
	);
};

export const withSearchTitleVariants =
	(search: SearchFunction): SearchFunction =>
	async (metadata) => {
		for (const title of getSearchTitleVariants(
			metadata.title,
			metadata.releaseType,
		)) {
			const result = await search({ ...metadata, title });
			if (result !== undefined) return result;
		}
		return undefined;
	};

export const getAlbumSearchQuery = (artist: string, title: string): string =>
	normalizeSearchText(artist) === "various artists"
		? title
		: `${artist} ${title}`;

const latinLetters: Readonly<Record<string, string>> = {
	æ: "ae",
	ð: "d",
	ø: "o",
	þ: "th",
	ß: "ss",
	đ: "d",
	ł: "l",
	œ: "oe",
};

export const normalizeSearchArtist = (name: string): string =>
	normalizeSearchText(name)
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.replace(/[æðøþßđłœ]/g, (letter) => latinLetters[letter]);

export const getSearchArtists = (artist: string, alias?: string): string[] => {
	const name = artist.trim();
	const alternate = alias?.trim();
	return alternate &&
		normalizeSearchText(alternate) !== normalizeSearchText(name)
		? [name, alternate]
		: [name];
};

export const getUnbracketedArtist = (artist: string): string | undefined => {
	const name = /^\[([^[\]]+)\]$/.exec(artist.trim())?.[1].trim();
	if (!name) return undefined;
	return name;
};

export const withArtistAlias =
	(search: SearchFunction): SearchFunction =>
	async (metadata) => {
		const result = await search(metadata);
		if (result !== undefined) return result;

		const artists = getSearchArtists(metadata.artist, metadata.artistAlias);
		const attempted = new Set([normalizeSearchText(metadata.artist)]);
		const candidates = [
			...artists.slice(1),
			...artists.map((name) => normalizeSearchArtist(name)),
			...artists.flatMap((name) => {
				const unbracketed = getUnbracketedArtist(name);
				return unbracketed
					? [unbracketed, normalizeSearchArtist(unbracketed)]
					: [];
			}),
		];
		for (const artist of candidates) {
			const name = normalizeSearchText(artist);
			if (attempted.has(name)) continue;
			attempted.add(name);
			const result = await search({
				...metadata,
				artist,
				artistAlias: metadata.artist,
			});
			if (result !== undefined) return result;
		}
		return undefined;
	};

export const isReissueTitle = (candidate: string, title: string): boolean => {
	const normalized = normalizeSearchTitle(candidate);
	const original = normalizeSearchTitle(title);
	return (
		original.length > 0 &&
		normalized.startsWith(original) &&
		/^(?:\s*\((?:переиздание|reissue|reissued)\)|\s*\[(?:переиздание|reissue|reissued)\]|\s+[-–—]\s+(?:переиздание|reissue|reissued))$/u.test(
			getSearchTitleSuffix(normalized, original),
		)
	);
};

export const isExpandedTitle = (candidate: string, title: string): boolean => {
	const normalized = normalizeSearchTitle(candidate);
	const original = normalizeSearchTitle(title);
	return (
		original.length > 0 &&
		normalized.startsWith(original) &&
		/^(?: \[expanded(?: edition)?\]| \(expanded(?: edition)?\)| [-–—] expanded(?: edition)?)$/.test(
			getSearchTitleSuffix(normalized, original),
		)
	);
};

export const isEditionSuffix = (suffix: string): boolean => {
	const normalized = suffix.replace(/\s+/g, " ");
	const edition =
		/ *(?:[([] *|[-–—] )(?:(?:\d{4} )?remaster(?:ed)?(?: (?:version|\d{4}))?|deluxe(?: (?:edition|version))?)[)\]]?/y;
	let position = 0;
	while (position < normalized.length) {
		edition.lastIndex = position;
		if (!edition.exec(normalized)) return false;
		position = edition.lastIndex;
	}
	return position > 0;
};

export const isEditionTitle = (candidate: string, title: string): boolean => {
	const normalized = normalizeSearchTitle(candidate);
	const original = normalizeSearchTitle(title);
	return (
		original.length > 0 &&
		normalized.startsWith(original) &&
		isEditionSuffix(getSearchTitleSuffix(normalized, original))
	);
};

export const isSoundtrackTitle = (
	candidate: string,
	title: string,
): boolean => {
	const normalized = normalizeSearchTitle(candidate);
	const original = normalizeSearchTitle(title);
	return (
		original.length > 0 &&
		normalized.startsWith(original) &&
		/^\s+\((?:official |original (?:(?:motion picture|video game) )?)?soundtrack\)$/.test(
			getSearchTitleSuffix(normalized, original),
		)
	);
};
