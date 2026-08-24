const SCORE_SELECTORS = [
	".avg_rating",
	".avg_rating_friends",
	".tr-ranking",
	".track_rating",
	".disco_avg_rating:not(.ebr-rating-visible)",
	".review_rating",
	".catalog_rating",
	".page_release_section_tracks_track_stats_scores",
	".page_artist_tracks_track_stats_scores",
	".component_discography_item_details_average",
	".component_discography_item_header_average",
	".newreleases_avg_rating_stat",
	".page_features_secondary_metadata_rating_final",
	".page_review_feature_rating",
	".or_q_rating_date_s",
];

const COUNT_SELECTORS = [
	".disco_ratings:not(.ebr-rating-visible)",
	".num_ratings",
	".catalog_rating_system_comment",
	".catalog_stats",
	".rating_info_table",
	".track_rating_hide > .tracks",
	".page_charts_section_charts_item_stats_ratings",
	".page_charts_section_charts_item_details_ratings",
	".component_discography_item_details_ratings",
	".component_discography_item_details_reviews",
	".component_discography_item_header_ratings",
	".component_discography_item_header_reviews",
	".disco_header_num_reviews",
	".disco_reviews",
	".newreleases_ratings_stat",
	".newreleases_wishlist_stat",
	".newreleases_info_header_items_right .newreleases_info_header_item",
	".frontpage_newreleases_info_header_items_right .newreleases_info_header_item",
	".trackratings",
	".track_rating_header",
	".page_charts_section_charts_item_details_reviews",
];

export const injectHideStyles = (): void => {
	if (document.getElementById("ebr-hide-ratings-styles")) return;

	const styleEl = document.createElement("style");
	styleEl.id = "ebr-hide-ratings-styles";

	const hiddenScores = SCORE_SELECTORS.map(
		(selector) => `body.ebr-hide-ratings ${selector}`,
	).join(", ");
	const hiddenCounts = COUNT_SELECTORS.map(
		(selector) => `body.ebr-hide-ratings.ebr-hide-rating-counts ${selector}`,
	).join(", ");

	styleEl.textContent = `
		${hiddenScores},
		${hiddenCounts} { opacity: 0 !important; }
		body.ebr-hide-ratings:not(.ebr-show-friends) .catalog_section,
		body.ebr-hide-ratings.ebr-manual-hide-ratings .catalog_section {
			display: none !important;
		}
		body.ebr-hide-ratings .or_q_review_td.ebr-track-ratings-only {
			display: none !important;
		}
		body.ebr-hide-ratings .or_q_review_td .track_rating_header,
		body.ebr-hide-ratings .or_q_review_td .trackratings {
			display: none !important;
		}
		.mbgen tr.ebr-collection-row-light {
			background: var(--mono-f) !important;
		}
		.mbgen tr.ebr-collection-row-dark {
			background: var(--mono-f4) !important;
		}
		body.ebr-hide-ratings.ebr-hide-rating-counts .section_catalog .release_page_header {
			display: none !important;
		}
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_stats,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_line:not(.my_rating):not(:has(.catalog_header.friend)),
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_section:not(:has(.catalog_header.friend)):not(:has(.catalog_line.my_rating)) {
			display: none !important;
		}
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_list {
			margin-right: 0;
		}
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_header.friend,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_header.friend .catalog_rating,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_header.friend .catalog_rating_system_comment,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_line.my_rating .catalog_header,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_line.my_rating .catalog_rating,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .catalog_line.my_rating .catalog_rating_system_comment,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .album_info tr:has(.avg_rating_friends) .num_ratings,
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .film_info tr:has(.avg_rating_friends) .num_ratings {
			opacity: 1 !important;
		}
		body.ebr-hide-ratings.ebr-release-rated:not(.ebr-hide-all-ratings):not(.ebr-manual-hide-ratings) .avg_rating:not(.avg_rating_friends),
		body.ebr-hide-ratings:not(.ebr-manual-hide-ratings).ebr-show-friends .avg_rating_friends,
		body.ebr-hide-ratings.ebr-release-rated:not(.ebr-hide-all-ratings):not(.ebr-manual-hide-ratings).ebr-show-tracks .track_rating,
		body.ebr-hide-ratings.ebr-release-rated:not(.ebr-hide-all-ratings):not(.ebr-manual-hide-ratings).ebr-show-tracks .page_release_section_tracks_track_stats_scores {
			opacity: 1 !important;
		}
		body.ebr-release-rated.ebr-track-after-own-rating:not(.ebr-tracks-rated):not(:has(.track_rating_disp .rating_stars:not(.star-0m))) .track_rating,
		body.ebr-release-rated.ebr-track-after-own-rating:not(.ebr-tracks-rated):not(:has(.track_rating_disp .rating_stars:not(.star-0m))) .page_release_section_tracks_track_stats_scores {
			opacity: 0 !important;
		}
		body.ebr-hide-ratings:not(.ebr-hide-all-ratings):not(.ebr-manual-hide-ratings).ebr-track-after-own-rating.ebr-tracks-rated .track_rating,
		body.ebr-hide-ratings:not(.ebr-hide-all-ratings):not(.ebr-manual-hide-ratings).ebr-track-after-own-rating.ebr-tracks-rated .page_release_section_tracks_track_stats_scores,
		body.ebr-hide-ratings:not(.ebr-hide-all-ratings):not(.ebr-manual-hide-ratings).ebr-track-after-own-rating:has(.track_rating_disp .rating_stars:not(.star-0m)) .track_rating,
		body.ebr-hide-ratings:not(.ebr-hide-all-ratings):not(.ebr-manual-hide-ratings).ebr-track-after-own-rating:has(.track_rating_disp .rating_stars:not(.star-0m)) .page_release_section_tracks_track_stats_scores {
			opacity: 1 !important;
		}
		body:not(.ebr-suggestions-ratings-visible) .section_suggestions .page_discography_average,
		body:not(.ebr-suggestions-ratings-visible) .section_suggestions .component_discography_item_details_average,
		body:not(.ebr-suggestions-ratings-visible) .section_suggestions .component_discography_item_header_average {
			opacity: 0 !important;
		}
		body.ebr-hide-rating-counts:not(.ebr-suggestions-ratings-visible) .section_suggestions .page_discography_ratings,
		body.ebr-hide-rating-counts:not(.ebr-suggestions-ratings-visible) .section_suggestions .page_discography_reviews,
		body.ebr-hide-rating-counts:not(.ebr-suggestions-ratings-visible) .section_suggestions .component_discography_item_details_ratings,
		body.ebr-hide-rating-counts:not(.ebr-suggestions-ratings-visible) .section_suggestions .component_discography_item_details_reviews,
		body.ebr-hide-rating-counts:not(.ebr-suggestions-ratings-visible) .section_suggestions .component_discography_item_header_ratings,
		body.ebr-hide-rating-counts:not(.ebr-suggestions-ratings-visible) .section_suggestions .component_discography_item_header_reviews {
			opacity: 0 !important;
		}
		body.ebr-suggestions-ratings-visible .section_suggestions .page_discography_average,
		body.ebr-suggestions-ratings-visible .section_suggestions .page_discography_ratings,
		body.ebr-suggestions-ratings-visible .section_suggestions .page_discography_reviews,
		body.ebr-suggestions-ratings-visible .section_suggestions .component_discography_item_details_average,
		body.ebr-suggestions-ratings-visible .section_suggestions .component_discography_item_details_ratings,
		body.ebr-suggestions-ratings-visible .section_suggestions .component_discography_item_details_reviews,
		body.ebr-suggestions-ratings-visible .section_suggestions .component_discography_item_header_average,
		body.ebr-suggestions-ratings-visible .section_suggestions .component_discography_item_header_ratings,
		body.ebr-suggestions-ratings-visible .section_suggestions .component_discography_item_header_reviews {
			opacity: 1 !important;
		}
		.ebr-rating-toggle {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 28px;
			height: 24px;
			padding: 0;
			border: 0;
			border-radius: 3px;
			cursor: pointer;
		}
		.ebr-rating-toggle svg {
			width: 16px;
			height: 16px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
		.ebr-release-rating-toggle {
			color: #fff;
			background: #4286c4;
		}
		.ebr-release-rating-toggle,
		.ebr-release-review-toggle,
		.ebr-suggestion-rating-toggle {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			box-sizing: border-box;
			background-image: none !important;
			padding: .25em .8em !important;
			margin: 0 .3em .3em 0;
			border-radius: 4px;
			color: #fff;
			background-color: #4286c4;
			font-size: .8em;
			line-height: 2.3;
		}
		.ebr-release-rating-toggle,
		.ebr-release-review-toggle {
			width: 145px;
		}
		#page_film .ebr-release-rating-toggle,
		#page_film .ebr-release-review-toggle {
			background-color: #b78424;
		}
		#page_film .ebr-release-rating-toggle:hover,
		#page_film .ebr-release-review-toggle:hover {
			background-color: #a4680d;
		}
		.my_catalog_review .ebr-release-toggle-wrapper {
			display: inline-block;
			float: none !important;
			vertical-align: middle;
		}
		.my_catalog_review {
			display: flex;
			align-items: center;
		}
		.my_catalog_rate_tracks {
			display: flex;
			align-items: center;
		}
		.ebr-suggestion-rating-toggle {
			width: 100%;
			margin-top: .5em;
		}
		.ebr-release-rating-toggle svg,
		.ebr-release-review-toggle svg,
		.ebr-suggestion-rating-toggle svg {
			width: 16px;
			height: 16px;
			vertical-align: middle;
			margin-right: 4px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
		.ebr-profile-rating-toggle {
			display: inline-flex;
			align-items: center;
			gap: .3em;
			margin: 0;
			font-size: .9em;
			vertical-align: baseline;
		}
		.ebr-profile-rating-control {
			margin: 0;
			padding: 0 1.5em;
		}
		.ebr-profile-rating-toggle svg {
			width: 1em;
			height: 1em;
			margin: 0;
			vertical-align: initial;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
		#page_artist.scope_film .ebr-profile-rating-toggle {
			background-color: #b78424;
		}
		#page_artist.scope_film .ebr-profile-rating-toggle:hover {
			background-color: #a4680d;
		}
		.ebr-rating-toggle-floating {
			position: fixed;
			right: 16px;
			bottom: 16px;
			z-index: 2147483647 !important;
			width: 190px;
			height: 30px;
			gap: 6px;
			justify-content: center;
			padding: 6px 10px;
			color: #fff;
			background: rgba(48, 48, 48, 0.6);
			font-size: 12px;
		}
		body:has(#ebr-show-review-btn-generic) .ebr-rating-toggle-floating {
			bottom: 52px;
		}
		.ebr-rating-module-toggle {
			right: 212px;
			bottom: 16px;
		}
		body:not(:has(#ebr-show-rating-btn-generic)) .ebr-rating-module-toggle {
			right: 16px;
		}
		body:has(#ebr-show-review-btn-generic) .ebr-rating-module-toggle {
			bottom: 52px;
		}
		body:has(#ebr-toggle-hide-reviews-btn) .ebr-rating-module-toggle {
			bottom: 52px;
		}
		body:has(#ebr-toggle-hide-reviews-btn) .ebr-rating-toggle-floating {
			bottom: 52px;
		}
	`;
	document.documentElement.appendChild(styleEl);
};

export const injectUnboldStyles = (): void => {
	if (document.getElementById("ebr-hide-ratings-unbold-styles")) return;

	const styleEl = document.createElement("style");
	styleEl.id = "ebr-hide-ratings-unbold-styles";

	styleEl.textContent = `
		body.ebr-hide-ratings .page_artist_songs_song .bolded,
		body.ebr-hide-ratings .tracks .track .bolded,
		body.ebr-hide-ratings .disco_release:not(:has(.ebr-rating-visible)) .disco_mainline_recommended {
			font-weight: normal !important;
		}
		body.ebr-hide-ratings .disco_release:not(:has(.ebr-rating-visible)) .disco_mainline_recommended a.album {
			color: var(--gen-blue-dark) !important;
		}
	`;
	document.documentElement.appendChild(styleEl);
};

export const removeHideStyles = (): void => {
	document.getElementById("ebr-hide-ratings-styles")?.remove();
	document.getElementById("ebr-hide-ratings-unbold-styles")?.remove();
};
