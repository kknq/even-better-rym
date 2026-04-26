const TOTAL_PATTERN = /Total length: (\d+):(\d+)/;
const DURATION_PATTERN = /^(\d+):(\d+)$/;

function convertTime(text: string, pattern: RegExp, prefix: string): string | null {
	const match = pattern.exec(text);
	if (!match) return null;

	const totalMins = Number.parseInt(match[1], 10);
	const seconds = match[2];

	const hours = Math.floor(totalMins / 60);
	if (hours === 0) return null;

	const remMins = (totalMins % 60).toString().padStart(2, "0");
	return `${prefix}${hours}:${remMins}:${seconds}`;
}

export function convertTotalTime(text: string): string | null {
	return convertTime(text, TOTAL_PATTERN, "Total length: ");
}

export function convertDuration(text: string): string | null {
	return convertTime(text.trim(), DURATION_PATTERN, "");
}
