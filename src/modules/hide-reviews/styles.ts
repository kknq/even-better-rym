const HIDE_SELECTORS = [
	".review_body",
	".review_text",
	".review_content",
	".page_review_feature_author",
	".page_review_feature_body",
	".or_q_review_td:not(:has(.track_rating_header))",
	".page_release_section_reviews .review",
	".page_release_section_reviews .review_item",
	".user_review",
	".review_list_item",
];

const HIDE_SECTION_SELECTORS = [
	".page_home_section_features:has(.page_review_feature)",
	".page_home_section_featured_content:has(.ui_featured_content_review)",
];

export const injectHideReviewStyles = (): void => {
	if (document.getElementById("ebr-hide-reviews-styles")) return;

	const style = document.createElement("style");
	style.id = "ebr-hide-reviews-styles";
	const hiddenReviews = HIDE_SELECTORS.map(
		(selector) => `body.ebr-hide-reviews ${selector}`,
	)
		.join(", ")
		.concat(" { opacity: 0 !important; }");
	const hiddenSections = HIDE_SECTION_SELECTORS.map(
		(selector) => `body.ebr-hide-reviews ${selector}`,
	)
		.join(", ")
		.concat(" { visibility: hidden !important; }");
	const visibleFriendReviews = [
		...HIDE_SELECTORS.map(
			(selector) =>
				`body.ebr-hide-reviews.ebr-show-friend-reviews [id^="review_shell_"]:has(.review_header.friend) ${selector}`,
		),
	]
		.join(", ")
		.concat(" { opacity: 1 !important; }");
	style.textContent = `${hiddenReviews}\n${hiddenSections}\n${visibleFriendReviews}`;
	style.textContent += `
		body.ebr-hide-reviews:not(.ebr-show-friend-reviews) .section_reviews {
			display: none !important;
		}
		body.ebr-hide-reviews.ebr-show-friend-reviews .section_reviews:not(:has(.review_header.friend)) {
			display: none !important;
		}
		body.ebr-hide-reviews:not(.ebr-show-friend-reviews) [id^="review_shell_"],
		body.ebr-hide-reviews.ebr-show-friend-reviews [id^="review_shell_"]:not(:has(.review_header.friend)) {
			display: none !important;
		}
		body.ebr-hide-reviews .or_q_review_td:not(:has(.track_rating_header)) {
			display: none !important;
		}
		body.ebr-hide-reviews .ebr-collection-review-content {
			display: none !important;
		}
		body.ebr-hide-ratings.ebr-hide-reviews .or_q_review_td:has(.track_rating_header) {
			display: none !important;
		}
		body.ebr-hide-reviews.ebr-show-friend-reviews .catalog_header.friend {
			opacity: 1 !important;
		}
		.ebr-release-review-toggle {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			box-sizing: border-box;
			width: 145px;
			color: #fff;
			background-color: #4286c4;
			background-image: none !important;
			padding: .25em .8em !important;
			margin: 0 .3em .3em 0;
			border-radius: 4px;
			font-size: .8em;
			line-height: 2.3;
		}
		.ebr-release-review-toggle svg {
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
		#page_film .ebr-release-review-toggle {
			background-color: #b78424;
		}
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
		.ebr-review-toggle-floating {
			position: fixed;
			right: 16px;
			bottom: 16px;
			z-index: 2147483647 !important;
			padding: 6px 10px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 190px;
			height: 30px;
			gap: 6px;
			color: #fff;
			background: rgba(48, 48, 48, 0.6);
			border: 0;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
		}
		.ebr-review-toggle-floating svg {
			width: 16px;
			height: 16px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
		.ebr-review-module-toggle {
			right: 212px;
		}
		body:not(:has(#ebr-show-review-btn-generic)) .ebr-review-module-toggle {
			right: 16px;
		}
	`;
	document.documentElement.appendChild(style);
};

export const removeHideReviewStyles = (): void =>
	document.getElementById("ebr-hide-reviews-styles")?.remove();
