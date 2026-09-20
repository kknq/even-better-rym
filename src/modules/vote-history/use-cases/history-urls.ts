export function getVoteHistoryUrl(path: string, currentSearch: string): string {
	const username = new URLSearchParams(currentSearch).get("username");
	const parameters = new URLSearchParams({ start: "0" });

	if (username !== null) {
		parameters.set("username", username);
	}

	return `${path}?${parameters.toString()}`;
}

export function getPaginationUrl(
	path: string,
	currentSearch: string,
	start: number,
): string {
	const parameters = new URLSearchParams(currentSearch);
	parameters.set("start", start.toString());

	return `${path}?${parameters.toString()}`;
}
