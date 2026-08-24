import { getPageEnabled, setPageEnabled } from "~/shared/page-settings";
import {
	getSessionVisibility,
	setSessionVisibility,
} from "~/shared/visibility/session-state";
import { wireButton } from "./button";
import { fireHide, fireShow } from "./events";

export const setupGenericPage = (
	showButton: boolean,
	preserveVisibility = false,
): void => {
	fireHide();
	const pathname = globalThis.location.pathname;
	const sessionVisibility = preserveVisibility
		? getSessionVisibility("ratings", pathname)
		: null;
	if (sessionVisibility) fireShow();
	if (!showButton) return;

	const button = document.createElement("button");
	button.id = "ebr-show-rating-btn-generic";
	button.type = "button";
	button.classList.add("ebr-rating-toggle", "ebr-rating-toggle-floating");
	wireButton(button, false, (visible) => {
		if (preserveVisibility) {
			setSessionVisibility("ratings", pathname, visible);
		}
	});

	document.body.appendChild(button);
};

export const insertGlobalRatingButton = (): void => {
	if (document.getElementById("ebr-toggle-hide-ratings-btn")) return;

	const button = document.createElement("button");
	button.id = "ebr-toggle-hide-ratings-btn";
	button.type = "button";
	button.classList.add(
		"ebr-rating-toggle",
		"ebr-rating-toggle-floating",
		"ebr-rating-module-toggle",
	);

	const update = async () => {
		const enabled = await getPageEnabled("hideRatings");
		const label = enabled ? "Disable Hide Ratings" : "Enable Hide Ratings";
		button.innerHTML = `<span>${label}</span>`;
		button.setAttribute("aria-label", label);
		button.setAttribute("title", label);
	};

	void update();
	button.addEventListener("click", async () => {
		await setPageEnabled("hideRatings", !(await getPageEnabled("hideRatings")));
		globalThis.location.reload();
	});
	document.body.appendChild(button);
};
