/**
 * Namespaced custom events used to coordinate the show/hide toggle across
 * every part of the feature (body class, button label, profile observer).
 */

export const fireHide = (): void => {
	document.dispatchEvent(new CustomEvent("ebrHideRatings"));
};

export const fireShow = (): void => {
	document.dispatchEvent(new CustomEvent("ebrShowRatings"));
};

/**
 * Keeps `document.body.classList` in sync with the current visibility state.
 * Must be called once after the body element exists.
 */
export const setupBodyListeners = (): void => {
	document.addEventListener("ebrHideRatings", () => {
		document.body.classList.remove("ratings-visible");
	});
	document.addEventListener("ebrShowRatings", () => {
		document.body.classList.add("ratings-visible");
	});
};
