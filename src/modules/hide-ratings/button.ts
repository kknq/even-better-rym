import { eyeIcon } from "~/shared/icons/eye";

import { fireHide, fireShow } from "./events";

export const wireButton = (
	button: HTMLElement,
	global = false,
	onVisibilityChange?: (visible: boolean) => void,
): void => {
	const toggleRatings = (): void => {
		if (button.dataset.hiding === "true") {
			document.body.classList.remove("ebr-manual-hide-ratings");
			fireShow();
			onVisibilityChange?.(true);
		} else {
			document.body.classList.add("ebr-manual-hide-ratings");
			fireHide();
			onVisibilityChange?.(false);
		}
	};

	const update = (hidden: boolean) => {
		button.dataset.hiding = String(hidden);
		const label = global
			? hidden
				? "Disable Hide Ratings"
				: "Enable Hide Ratings"
			: hidden
				? "Show Ratings"
				: "Hide Ratings";
		button.innerHTML = `${eyeIcon(hidden)}<span>${label}</span>`;
		button.setAttribute("aria-label", label);
		button.setAttribute("title", label);
	};

	update(document.body.classList.contains("ebr-hide-ratings"));

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
		update(true);
	});

	document.addEventListener("ebrShowRatings", () => {
		update(false);
	});
};
