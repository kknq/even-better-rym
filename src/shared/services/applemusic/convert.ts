export function convertAppleMusicDuration(appleMusicDuration: string) {
	const matches = /PT(?:(\d+?)M)?(?:(\d+?)S)?/.exec(appleMusicDuration);

	if (!matches) {
		throw new Error(`Invalid format: ${appleMusicDuration}`);
	}

	const mins = matches[1] ?? "0";
	const secs = matches[2] ?? "00";
	const seconds = secs.length === 1 ? `0${secs}` : secs;

	return `${mins}:${seconds}`;
}
