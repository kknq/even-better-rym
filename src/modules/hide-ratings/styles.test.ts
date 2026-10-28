// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { injectHideStyles } from "./styles";

const bootstrapStyles = readFileSync(
	"src/shared/visibility/bootstrap.css",
	"utf8",
);

// Relevant markup from the saved Tha Carter classifier and Cash Money label pages.
const classifierMarkup = `
	<table class="mbgen">
		<tbody>
			<tr><td id="classifier-description">Series</td></tr>
			${["abmrat", "abmratg"]
				.map(
					(ratingClass) => `<tr>
						<td>2004</td>
						<td><a class="artist">Artist</a></td>
						<td><a class="album">Title</a></td>
						<td><a class="label">Catalog number</a></td>
						<td data-count>40</td>
						<td data-count>3,870</td>
						<td>
							<div class="${ratingClass}" data-score style="width:64%">&nbsp;</div>
							<div class="abmpop" data-count style="width:89%">&nbsp;</div>
						</td>
						<td data-score><div class="medium">3.20</div></td>
					</tr>`,
				)
				.join("")}
		</tbody>
	</table>
`;

const labelMarkup = `
	<div class="component_discography_item">
		<a class="album">Title</a>
		<div class="component_discography_item_stats_compact">
			<span class="component_discography_item_stats_compact_section">
				<span class="stat has_tip" data-count>80</span> Ratings
			</span>
			<span class="component_discography_item_stats_compact_section">
				<span class="stat has_tip" data-count>2</span> Reviews
			</span>
			<span class="component_discography_item_stats_compact_section">
				<span class="stat component_discography_item_details_average_num" data-score>3.40</span> Average
			</span>
		</div>
		<div class="component_discography_item_stats">
			<span class="component_discography_item_details_average" data-score>3.40</span>
			<span class="component_discography_item_details_ratings" data-count>80</span>
			<span class="component_discography_item_details_reviews" data-count>2</span>
		</div>
	</div>
`;

const expectOpacity = (selector: string, hidden: boolean): void => {
	const elements = [...document.querySelectorAll(selector)];
	expect(elements.length).toBeGreaterThan(0);
	for (const element of elements) {
		expect(getComputedStyle(element).opacity, element.outerHTML).toBe(
			hidden ? "0" : "1",
		);
	}
};

beforeEach(() => {
	document.head.replaceChildren();
	document.body.replaceChildren();
	document.body.className = "";
	document.documentElement.className = "";
});

describe.each([
	["classifier", classifierMarkup],
	["label", labelMarkup],
])("%s rating styles", (_page, markup) => {
	it("hides scores while preserving counts and release information by default", () => {
		document.body.innerHTML = markup;
		injectHideStyles();
		document.body.classList.add("ebr-hide-ratings");

		expectOpacity("[data-score]", true);
		expectOpacity("[data-count]", false);
		expectOpacity(".album", false);
	});

	it("hides counts only with the hide-counts policy and reveals them with scores", () => {
		document.body.innerHTML = markup;
		injectHideStyles();
		document.body.classList.add("ebr-hide-ratings", "ebr-hide-rating-counts");

		expectOpacity("[data-score]", true);
		expectOpacity("[data-count]", true);
		expectOpacity(".album", false);

		document.body.classList.remove("ebr-hide-ratings");
		expectOpacity("[data-score]", false);
		expectOpacity("[data-count]", false);
	});

	it("prevents initial score and count flashes until ratings are ready", () => {
		document.body.innerHTML = markup;
		const style = document.createElement("style");
		style.textContent = bootstrapStyles;
		document.head.appendChild(style);

		expectOpacity("[data-score]", true);
		expectOpacity("[data-count]", true);
		expectOpacity(".album", false);

		document.documentElement.classList.add("ebr-ratings-ready");
		expectOpacity("[data-score]", false);
		expectOpacity("[data-count]", false);
	});
});

it("does not hide unrelated classifier description cells", () => {
	document.body.innerHTML = classifierMarkup;
	injectHideStyles();
	document.body.classList.add("ebr-hide-ratings", "ebr-hide-rating-counts");

	expectOpacity("#classifier-description", false);
});
