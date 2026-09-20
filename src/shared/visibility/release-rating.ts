const OWN_RELEASE_RATING_SELECTOR =
	"#catalog_list .my_rating, .catalog_line.my_rating, .release_my_catalog .my_catalog_rating .rating_stars:not(.star-0m)";
const RELEASE_RATING_CONTROL_SELECTOR =
	".release_my_catalog .my_catalog_rating";

export const hasOwnReleaseRating = (): boolean =>
	document.querySelector(OWN_RELEASE_RATING_SELECTOR) !== null;

export const observeOwnReleaseRating = (
	onChange: (hasRating: boolean) => void,
): MutationObserver => {
	let hasRating = hasOwnReleaseRating();
	let ratingSavePending = false;
	const observer = new MutationObserver((mutations) => {
		let ratingSaveCompleted = false;
		for (const mutation of mutations) {
			if (!(mutation.target instanceof HTMLElement)) continue;

			const ratingControl = mutation.target.closest<HTMLElement>(
				RELEASE_RATING_CONTROL_SELECTOR,
			);
			if (!ratingControl) continue;

			if (ratingControl.classList.contains("loading")) {
				ratingSavePending = true;
				continue;
			}
			if (!ratingSavePending) continue;

			ratingSavePending = false;
			ratingSaveCompleted = true;
			break;
		}
		if (!ratingSaveCompleted) return;

		const nextHasRating = hasOwnReleaseRating();
		if (nextHasRating === hasRating) return;

		hasRating = nextHasRating;
		onChange(hasRating);
	});

	observer.observe(document.body, {
		attributes: true,
		attributeFilter: ["class"],
		subtree: true,
	});
	return observer;
};
