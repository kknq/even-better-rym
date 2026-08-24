const HIDE_SELECTORS = [
	".section_comments",
	".page_release_section_comments form",
	".page_release_section_comments .commentbox",
	".page_release_section_comments .comment_box",
	"#comments form",
	"#comments .commentbox",
	"#comments .comment_box",
	".section_comments .comments_post",
	".section_comments .comment_new",
	".section_comments .comment_post_add_btn",
	".comments .comments_post",
	".comments .comment_new",
	".comments .comment_post_add_btn",
];

export const injectHideCommentBoxStyles = (): void => {
	if (document.getElementById("ebr-hide-comment-boxes-styles")) return;

	const style = document.createElement("style");
	style.id = "ebr-hide-comment-boxes-styles";
	style.textContent = HIDE_SELECTORS.map(
		(selector) => `body.ebr-hide-comment-boxes ${selector}`,
	)
		.join(", ")
		.concat(" { display: none !important; }");
	document.documentElement.appendChild(style);
};

export const removeHideCommentBoxStyles = (): void =>
	document.getElementById("ebr-hide-comment-boxes-styles")?.remove();
