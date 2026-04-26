const TIME_PATTERN = /Total length: (\d+):(\d+)/;

export function convertTotalTime(text: string): string | null {
	const match = TIME_PATTERN.exec(text);
	if (!match) return null;

	const totalMins = Number.parseInt(match[1], 10);
	const seconds = match[2];

	const hours = Math.floor(totalMins / 60);
	if (hours === 0) return null;

	const remMins = (totalMins % 60).toString().padStart(2, "0");
	return `${hours}:${remMins}:${seconds}`;
}
