import { wireButton } from "./button";
import { fireHide } from "./events";

/**
 * Generic page (charts, homepage, `/film_genre/*`, and everything else).
 *
 * Hides ratings globally and injects a small fixed-position floating toggle
 * button in the bottom-right corner. The anchor can be relocated once the
 * right container element is identified for each specific page type.
 */
export const setupGenericPage = (): void => {
	fireHide();

	const button = document.createElement("button");
	button.id = "ebr-show-rating-btn-generic";
	wireButton(button);

	button.style.cssText = `
		position: fixed;
		bottom: 16px;
		right: 16px;
		z-index: 9999;
		padding: 6px 10px;
		background: var(--gen-bg-secondary, #222);
		color: var(--gen-text-primary, #eee);
		border: 1px solid var(--gen-border-color, #555);
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
	`;

	document.body.appendChild(button);
};
