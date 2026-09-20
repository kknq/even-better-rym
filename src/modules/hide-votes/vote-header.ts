export function formatVoteHeader(
	before: string,
	voteForCount: number,
	voteAgainstCount: number,
	html: string,
	hideStats: boolean,
): string {
	if (hideStats) {
		return before
			.replace(/\(\s*[\d,.]+\s*\/\s*/, "(")
			.replace(/\s*\(\s*[\d,.]+\s*\)\s*:?\s*$/, "")
			.replace(/\s*\(\s*\)\s*:?\s*$/, "");
	}

	const totalVotes = voteForCount + voteAgainstCount;
	const isVoteFor = html.includes("voted for:");
	const currentCount = isVoteFor ? voteForCount : voteAgainstCount;
	const percentage =
		totalVotes > 0 ? ((currentCount / totalVotes) * 100).toFixed(1) : "0.0";

	if (html.includes('title="unweighted degree average"')) {
		return `${before} ${currentCount}/${totalVotes}, ${percentage}%`;
	}

	return before.replace(/\((\d+)\)/, `($1/${totalVotes}, ${percentage}%)`);
}

export function hideVoteStatsHtml(html: string): string {
	return html
		.replace(
			/\(\s*(?:[\d,.]+(?:\s*%)?|<[^>]+>\s*[\d,.]+(?:\s*%)?\s*<\/[^>]+>)\s*\)/g,
			"",
		)
		.replace(
			/<span\b[^>]*\btitle="unweighted degree average"[^>]*>[\d,.]+<\/span>/g,
			"",
		)
		.replace(/\((?:\s|&nbsp;)*\)/g, "");
}
