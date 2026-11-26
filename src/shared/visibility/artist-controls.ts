export function getArtistControls(): HTMLElement | null {
	const navigation = document.querySelector<HTMLElement>(
		".section_artist_page_section_nav",
	);
	if (!navigation) return null;

	const previous = navigation.previousElementSibling;
	if (
		previous instanceof HTMLElement &&
		previous.matches(".ebr-profile-rating-control")
	) {
		return previous;
	}

	const control = document.createElement("div");
	control.className = "ebr-profile-rating-control";
	navigation.before(control);
	return control;
}
