const HIDE_SELECTORS = [
	".avg_rating",
	".avg_rating_friends",
	".tr-ranking",
	".track_rating",
	".disco_avg_rating:not(.ebr-rating-visible)",
	".disco_ratings:not(.ebr-rating-visible)",
	".review_rating",
	".catalog_rating",
	".catalog_rating_system_comment",
	".catalog_stats",
	".track_rating_hide > .tracks",
	".page_release_section_tracks_track_stats_scores",
	".page_artist_tracks_track_stats_scores",
	".page_charts_section_charts_item_stats_ratings",
	".page_charts_section_charts_item_details_ratings",
	".component_discography_item_details_ratings",
	".newreleases_avg_rating_stat",
	".newreleases_ratings_stat",
	".newreleases_info_header_items_right .newreleases_info_header_item:nth-child(-n + 2)",
	".page_features_secondary_metadata_rating_final",
	".page_review_feature_rating",
	".or_q_rating_date_s",
	".trackratings",
	".track_rating_header",
];

export const injectHideStyles = (): void => {
	if (document.getElementById("ebr-hide-ratings-styles")) return;

	const styleEl = document.createElement("style");
	styleEl.id = "ebr-hide-ratings-styles";

	const hidden = HIDE_SELECTORS.map(
		(s) => `body:not(.ratings-visible) ${s}`,
	).join(", ");

	styleEl.textContent = `
		${hidden} { opacity: 0 !important; }
		.ebr-rating-toggle-floating {
			position: fixed;
			right: 16px;
			bottom: 16px;
			z-index: 9999;
			padding: 6px 10px;
			color: var(--mono-4);
			background: var(--mono-db);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
		}
	`;
	document.documentElement.appendChild(styleEl);
};

export const injectUnboldStyles = (): void => {
	if (document.getElementById("ebr-hide-ratings-unbold-styles")) return;

	const styleEl = document.createElement("style");
	styleEl.id = "ebr-hide-ratings-unbold-styles";

	styleEl.textContent = `
		body:not(.ratings-visible) .page_artist_songs_song .bolded,
		body:not(.ratings-visible) .tracks .track .bolded,
		body:not(.ratings-visible) .disco_release:not(:has(.ebr-rating-visible)) .disco_mainline_recommended {
			font-weight: normal !important;
		}
		body:not(.ratings-visible) .disco_release:not(:has(.ebr-rating-visible)) .disco_mainline_recommended a.album {
			color: var(--gen-blue-dark) !important;
		}
	`;
	document.documentElement.appendChild(styleEl);
};

export const removeHideStyles = (): void => {
	document.getElementById("ebr-hide-ratings-styles")?.remove();
	document.getElementById("ebr-hide-ratings-unbold-styles")?.remove();
};
