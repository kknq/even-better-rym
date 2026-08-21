import { wireButton } from "./button";
import { fireHide } from "./events";

export const setupGenericPage = (): void => {
	fireHide();

	const button = document.createElement("button");
	button.id = "ebr-show-rating-btn-generic";
	button.type = "button";
	button.classList.add("ebr-rating-toggle", "ebr-rating-toggle-floating");
	wireButton(button);

	document.body.appendChild(button);
};
