import type { ReleaseFormat } from "../types";

const vinylRegex =
	/^(?:(\d+)\s+)?(?:(\d+(?:\.\d+)?)"\s*)?vinyls?\b(?:\s*\(\s*(\d+(?:\s*(?:⅓|⅔|1\/3))?)\s*RPM\s*\))?$/i;
const VERSION_FORMATS: readonly (readonly [RegExp, ReleaseFormat])[] = [
	[/\bcd-r\b/i, "cd-r"],
	[/\bdvd-r\b/i, "dvd-r"],
	[/\bdvd-a\b/i, "dvd-a"],
];

export const getReleaseFormat = (
	formatString: string | undefined,
	versionDescription: string | undefined,
): ReleaseFormat | undefined => {
	const leadingFormat = formatString
		?.trim()
		.toLowerCase()
		.split("+")
		.map((part) => part.trim())[0];
	for (const value of [versionDescription, leadingFormat]) {
		const format = VERSION_FORMATS.find(([pattern]) =>
			pattern.test(value ?? ""),
		);
		if (format) return format[1];
	}

	if (/\d*\s*cd\b/i.test(leadingFormat ?? "")) return "cd";
	if (/\d*\s*dvd\b/i.test(leadingFormat ?? "")) return "dvd";
	if (/\d*\s*blu-rays?\b/i.test(leadingFormat ?? "")) return "blu-ray";
	if (vinylRegex.test(leadingFormat ?? "")) return "vinyl";
	switch (leadingFormat) {
		case "other":
		case "unknown":
			return undefined;
		case "digital":
			return "digital file";
		default:
			return leadingFormat as ReleaseFormat | undefined;
	}
};

export const getVinylFormatMatch = (formatString: string | undefined) =>
	formatString ? vinylRegex.exec(formatString) : undefined;
