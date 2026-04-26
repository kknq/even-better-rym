const HIDE_SELECTORS = [
	".avg_rating",
	".avg_rating_friends",
	".tr-ranking",
	".track_rating",
	".disco_avg_rating:not(.tm-visible)",
	".review_rating",
	".catalog_rating",
	".catalog_rating_system_comment",
	".catalog_stats",
	".track_rating_hide > .tracks",
	".page_release_section_tracks_track_stats_scores",
	".page_artist_tracks_track_stats_scores",
];

/**
 * Injects a `<style>` element early (at `document_start`) that hides all
 * rating-related elements by default. The `:active` pseudo-class allows
 * clicking an element to briefly reveal the value.
 */
export const injectHideStyles = (): void => {
	const styleEl = document.createElement("style");
	styleEl.id = "ebr-hide-ratings-styles";

	const hidden = HIDE_SELECTORS.map(
		(s) => `body:not(.ratings-visible) ${s}`,
	).join(", ");

	const active = HIDE_SELECTORS.map(
		(s) => `body:not(.ratings-visible) ${s}:active`,
	).join(", ");

	styleEl.textContent = `${hidden} { opacity: 0 !important; } ${active} { opacity: 1 !important; }`;
	document.documentElement.appendChild(styleEl);
};

/**
 * Injects a `<style>` element that removes bold styling from tracks and
 * releases whose ratings are currently hidden, preserving the visual hint
 * only while a rating cell is actively pressed.
 */
export const injectUnboldStyles = (): void => {
	const styleEl = document.createElement("style");
	styleEl.id = "ebr-hide-ratings-unbold-styles";

	styleEl.textContent = `
		body:not(.ratings-visible) .page_artist_songs_song:not(:has(.page_artist_tracks_track_stats_scores:active)) .bolded,
		body:not(.ratings-visible) .tracks .track:not(:has(.page_release_section_tracks_track_stats_scores:active)) .bolded,
		body:not(.ratings-visible) .disco_release:not(:has(.disco_avg_rating:active, .tm-visible)) .disco_mainline_recommended,
		body:not(.ratings-visible) .films > li:not(:has(.disco_avg_rating:active, .tm-visible)) .recommended a.film {
			font-weight: normal !important;
		}
		body:not(.ratings-visible) .disco_release:not(:has(.disco_avg_rating:active, .tm-visible)) .disco_mainline_recommended a.album {
			color: var(--gen-blue-dark) !important;
		}
	`;
	document.documentElement.appendChild(styleEl);
};
