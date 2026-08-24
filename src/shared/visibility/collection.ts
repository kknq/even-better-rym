export const prepareCollectionRows = (): void => {
	for (const review of document.querySelectorAll<HTMLElement>(".or_q_review")) {
		const trackRatings = review.querySelector<HTMLElement>(
			".track_rating_header",
		);
		if (!trackRatings || review.querySelector(".ebr-collection-review-content"))
			continue;

		const reviewContent = document.createElement("div");
		reviewContent.classList.add("ebr-collection-review-content");
		while (review.firstChild && review.firstChild !== trackRatings) {
			reviewContent.appendChild(review.firstChild);
		}

		if (reviewContent.textContent?.trim()) {
			trackRatings.before(reviewContent);
		} else {
			reviewContent.remove();
			review
				.closest(".or_q_review_td")
				?.classList.add("ebr-track-ratings-only");
		}
	}
};
