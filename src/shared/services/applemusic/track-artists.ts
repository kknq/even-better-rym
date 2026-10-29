type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function readArtists(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((link: unknown) =>
		isObject(link) && typeof link.title === "string" ? [link.title] : [],
	);
}

export const findTrackLockupScriptText = (
	document_: Document,
): string | undefined =>
	[...document_.querySelectorAll("script")].find((script) =>
		script.text.includes("track-lockup"),
	)?.text;

// Lockups are in album order; trackNumber alone is not unique across discs.
export const getTrackArtists = (
	scriptText: string | undefined,
): Map<number, string[]> => {
	const artists = new Map<number, string[]>();
	if (scriptText === undefined) return artists;
	let data: unknown;
	try {
		data = JSON.parse(scriptText);
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		console.warn(
			"EvenBetterRYM: could not read Apple Music track artists",
			error,
		);
		return artists;
	}
	let position = 0;
	const visit = (value: unknown): void => {
		if (Array.isArray(value)) {
			value.forEach(visit);
		} else if (isObject(value)) {
			if (typeof value.trackNumber === "number") {
				position += 1;
				const names = readArtists(value.subtitleLinks);
				if (names.length > 0) artists.set(position, names);
				return;
			}
			Object.values(value).forEach(visit);
		}
	};
	visit(data);
	return artists;
};
