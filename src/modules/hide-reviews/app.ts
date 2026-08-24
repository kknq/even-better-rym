import { eyeIcon } from "~/shared/icons/eye";
import { getPageEnabled, setPageEnabled } from "~/shared/page-settings";
import { waitForDocumentReady } from "~/shared/utils/dom";
import { isOwnProfile, isOwnUserPage } from "~/shared/utils/user";
import { prepareCollectionRows } from "~/shared/visibility/collection";
import {
	getSessionVisibility,
	setSessionVisibility,
} from "~/shared/visibility/session-state";
import {
	getReviewSettings,
	type ReviewVisibilityPage,
} from "~/shared/visibility/settings";

import {
	getRatingsPageType,
	isReleaseReviewList,
	preservesListVisibility,
} from "../hide-ratings/page-type";
import { injectHideReviewStyles } from "./styles";

const REVIEW_PAGES = new Set<string>([
	"home",
	"release",
	"film",
	"collection",
	"profile",
	"review",
]);

const isReviewPage = (page: string): page is ReviewVisibilityPage =>
	REVIEW_PAGES.has(page);

export const main = async (): Promise<void> => {
	const settings = await getReviewSettings();
	const page = getRatingsPageType(globalThis.location.pathname);
	if (!page || !isReviewPage(page) || !settings.pages[page]) return;

	await waitForDocumentReady();
	if (page === "profile" && isOwnProfile()) return;
	if (page === "collection" && isOwnUserPage()) return;
	if (page === "collection") prepareCollectionRows();

	const hasReleaseRating = Boolean(
		document.querySelector("#catalog_list .my_rating, .catalog_line.my_rating"),
	);
	const shouldHide =
		settings.reviews === "always" ||
		(page !== "release" && page !== "film") ||
		!hasReleaseRating;
	document.body.classList.toggle("ebr-hide-reviews", shouldHide);
	const preserveVisibility = preservesListVisibility(
		page,
		globalThis.location.pathname,
	);
	const sessionVisibility = preserveVisibility
		? getSessionVisibility("reviews", globalThis.location.pathname)
		: null;
	if (sessionVisibility !== null) {
		document.body.classList.toggle("ebr-hide-reviews", !sessionVisibility);
	}
	injectHideReviewStyles();
	document.body.classList.toggle(
		"ebr-show-friend-reviews",
		shouldHide &&
			(page === "release" || page === "film") &&
			(settings.friends === "always" ||
				(settings.friends === "after-release-rated" && hasReleaseRating)),
	);
	if (settings.globalButton) {
		insertGlobalReviewButton();
	}
	if (settings.buttons) {
		if (
			(page === "release" || page === "film") &&
			!isReleaseReviewList(globalThis.location.pathname)
		) {
			insertReleaseReviewButton();
		} else {
			insertReviewButton(false, preserveVisibility);
		}
	}
};

const insertReleaseReviewButton = (): void => {
	const buttonRow = document.querySelector<HTMLElement>(
		".release_my_catalog, .page_release_section_reviews, #content",
	);
	if (!buttonRow || document.getElementById("ebr-show-review-btn-release"))
		return;

	const wrapper = document.createElement("div");
	wrapper.id = "ebr-show-review-btn-release-wrapper";
	wrapper.classList.add("ebr-release-toggle-wrapper");
	wrapper.style.float = "left";

	const button = document.createElement("div");
	button.id = "ebr-show-review-btn-release";
	button.tabIndex = 0;
	button.setAttribute("role", "button");
	button.classList.add("review_btn", "ebr-release-review-toggle");
	wireReviewButton(button, false);
	wrapper.appendChild(button);

	const reviewControls = buttonRow.querySelector(".my_catalog_review");
	const isFilm = document.documentElement.id === "page_film";
	const controlRow = isFilm ? (reviewControls ?? buttonRow) : buttonRow;
	const nativeControl = isFilm
		? controlRow.querySelector("#review_btn")
		: buttonRow.querySelector("#track_rating_btn");
	const ratingWrapper = document.getElementById(
		"ebr-show-rating-btn-release-wrapper",
	);
	const clearEl = controlRow.querySelector(".clear");
	if (ratingWrapper) ratingWrapper.after(wrapper);
	else if (nativeControl) nativeControl.after(wrapper);
	else if (clearEl) clearEl.before(wrapper);
	else controlRow.appendChild(wrapper);
};

const insertReviewButton = (
	global: boolean,
	preserveVisibility = false,
): void => {
	const id = global
		? "ebr-toggle-hide-reviews-btn"
		: "ebr-show-review-btn-generic";
	if (document.getElementById(id)) return;

	const button = document.createElement("button");
	button.id = id;
	button.type = "button";
	button.classList.add("ebr-review-toggle-floating");
	if (global) {
		button.classList.add("ebr-review-module-toggle");
		wireGlobalReviewButton(button);
	} else {
		wireReviewButton(button, false, (visible) => {
			if (preserveVisibility) {
				setSessionVisibility("reviews", globalThis.location.pathname, visible);
			}
		});
	}
	document.body.appendChild(button);
};

export const insertGlobalReviewButton = (): void => insertReviewButton(true);

const wireGlobalReviewButton = (button: HTMLElement): void => {
	const update = async () => {
		const enabled = await getPageEnabled("hideReviews");
		const label = enabled ? "Disable Hide Reviews" : "Enable Hide Reviews";
		button.innerHTML = `<span>${label}</span>`;
		button.setAttribute("aria-label", label);
	};

	void update();
	button.addEventListener("click", async () => {
		await setPageEnabled("hideReviews", !(await getPageEnabled("hideReviews")));
		globalThis.location.reload();
	});
};

const wireReviewButton = (
	button: HTMLElement,
	global: boolean,
	onVisibilityChange?: (visible: boolean) => void,
): void => {
	const update = (hidden: boolean) => {
		button.dataset.hiding = String(hidden);
		const label = global
			? hidden
				? "Disable Hide Reviews"
				: "Enable Hide Reviews"
			: hidden
				? "Show Reviews"
				: "Hide Reviews";
		button.innerHTML = `${eyeIcon(hidden)}<span>${label}</span>`;
		button.setAttribute("aria-label", label);
	};

	const toggle = () => {
		const hidden = button.dataset.hiding === "true";
		document.body.classList.toggle("ebr-hide-reviews", !hidden);
		onVisibilityChange?.(hidden);
		update(!hidden);
	};

	update(document.body.classList.contains("ebr-hide-reviews"));
	button.addEventListener("click", toggle);
	if (button.getAttribute("role") === "button") {
		button.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;

			event.preventDefault();
			toggle();
		});
	}
};
