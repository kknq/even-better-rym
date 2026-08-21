import { fireHide, fireShow } from "./events";

/**
 * Wires a DOM element as a Show/Hide Ratings toggle button.
 *
 * - Sets the initial label to "Show Ratings".
 * - On click dispatches the appropriate custom event.
 * - Listens for custom events so the label stays in sync when other code
 *   triggers a visibility change.
 */
export const wireButton = (button: HTMLElement): void => {
	const toggleRatings = (): void => {
		if (button.dataset.hiding === "true") {
			fireShow();
		} else {
			fireHide();
		}
	};

	button.textContent = "Show Ratings";
	button.dataset.hiding = "true";

	button.addEventListener("click", (event) => {
		event.preventDefault();
		toggleRatings();
	});

	if (button.getAttribute("role") === "button") {
		button.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;

			event.preventDefault();
			toggleRatings();
		});
	}

	document.addEventListener("ebrHideRatings", () => {
		button.dataset.hiding = "true";
		button.textContent = "Show Ratings";
	});

	document.addEventListener("ebrShowRatings", () => {
		button.dataset.hiding = "false";
		button.textContent = "Hide Ratings";
	});
};
