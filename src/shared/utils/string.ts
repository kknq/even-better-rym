export const regexIndexOf = (
	string: string,
	regex: RegExp,
	startpos?: number,
): number => {
	const indexOf = string.slice(Math.max(0, startpos ?? 0)).search(regex);
	return indexOf >= 0 ? indexOf + (startpos ?? 0) : indexOf;
};

export const regexLastIndexOf = (
	string: string,
	regex: RegExp,
	startpos?: number,
): number => {
	regex = regex.global
		? regex
		: (() => {
				const ignoreCase = regex.ignoreCase ? "i" : "";
				const multiline = regex.multiline ? "m" : "";
				return new RegExp(regex.source, `g${ignoreCase}${multiline}`);
			})();
	if (startpos === undefined) {
		startpos = string.length;
	} else if (startpos < 0) {
		startpos = 0;
	}
	const stringToWorkWith = string.slice(0, Math.max(0, startpos + 1));
	let lastIndexOf = -1;
	let nextStop = 0;
	let result: RegExpExecArray | null;
	while ((result = regex.exec(stringToWorkWith)) !== null) {
		lastIndexOf = result.index;
		regex.lastIndex = ++nextStop;
	}
	return lastIndexOf;
};

export const htmlDecode = (input: string) =>
	new DOMParser().parseFromString(input, "text/html").documentElement
		.textContent;

export const arrayToArtists = (artists: string[]): string => {
	if (artists.length === 1) {
		return artists[0];
	} else if (artists.length === 2) {
		return artists.join(" & ");
	} else {
		const lastArtist = artists.pop();
		return `${artists.join(", ")} & ${lastArtist}`;
	}
};
