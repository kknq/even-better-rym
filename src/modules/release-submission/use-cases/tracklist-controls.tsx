import { forceQuerySelector, waitForElement } from "~/shared/utils/dom";

import type { CapitalizationType } from "../utils/capitalization";
import { reportSubmissionError } from "../utils/report-error";
import { editTracklistText } from "../utils/simple-tracklist";
import { convertTracklistCase } from "../utils/tracklist";

export default async function injectTracklistControls() {
	const clearAll = await waitForElement("a#clearAll");

	const lengthClear = document.createElement("a");
	lengthClear.id = "clearAllLengths";
	lengthClear.className = "btn blue_btn btn_small rating_btn";
	lengthClear.href = "javascript:void(0);";
	lengthClear.style.visibility = "visible";
	lengthClear.textContent = "clear lengths";

	lengthClear.addEventListener("click", () => {
		const advancedInputContainer = forceQuerySelector(document)("#tracks_adv");
		const isAdvanced =
			globalThis.getComputedStyle(advancedInputContainer).display !== "none";

		const advancedInput =
			forceQuerySelector<HTMLTextAreaElement>(document)("#track_advanced");

		if (!isAdvanced)
			forceQuerySelector<HTMLAnchorElement>(document)("#goAdvancedBtn").click();

		advancedInput.value = advancedInput.value
			.split("\n")
			.filter((line) => line.length > 0)
			.map((line) => [...line.split("|").slice(0, 2), ""].join("|"))
			.join("\n");

		if (!isAdvanced)
			forceQuerySelector<HTMLAnchorElement>(document)("#goSimpleBtn").click();
	});

	const caseButtons: [Exclude<CapitalizationType, "as-is">, string][] = [
		["sentence-case", "convert to sentence case"],
		["title-case", "convert to title case"],
	];
	const caseControls = document.createElement("div");
	caseControls.className = "ebr-tracklist-case-controls";
	caseControls.append(
		...caseButtons.map(([capitalization, label]) => {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "btn blue_btn btn_small rating_btn";
			button.style.cssText = "margin: 0; visibility: visible;";
			button.textContent = label;
			button.addEventListener("click", () => {
				void editTracklistText((text) =>
					convertTracklistCase(text, capitalization),
				)
					.then(() => {
						forceQuerySelector(document)("#track_advanced").dispatchEvent(
							new Event("change", { bubbles: true }),
						);
					})
					.catch(reportSubmissionError);
			});
			return button;
		}),
	);
	const actionsCell = clearAll.closest("td");
	const toolbarRow = actionsCell?.parentElement;
	const toolbarTable = actionsCell?.closest("table");
	if (!actionsCell || !toolbarRow || !toolbarTable) {
		throw new Error("Could not find the tracklist toolbar row");
	}
	const addTrack =
		forceQuerySelector<HTMLAnchorElement>(toolbarRow)("#addTrack");
	const simple =
		forceQuerySelector<HTMLAnchorElement>(toolbarRow)("#goSimpleBtn");
	const advanced =
		forceQuerySelector<HTMLAnchorElement>(toolbarRow)("#goAdvancedBtn");
	const viewCell = simple.closest("td");
	if (!viewCell || viewCell === actionsCell) {
		throw new Error("Could not find the tracklist view controls cell");
	}
	const insertLink = forceQuerySelector<HTMLAnchorElement>(viewCell)(
		"a:not(#goSimpleBtn):not(#goAdvancedBtn)",
	);

	const toolbar = document.createElement("div");
	toolbar.className = "ebr-tracklist-toolbar";
	toolbar.style.cssText =
		"display: flex; align-items: center; gap: .5em; width: max-content; box-sizing: border-box; padding: .33em; background: var(--mono-f4); border: 1px solid var(--mono-e8);";
	const scrollContainer = document.createElement("div");
	scrollContainer.className = "ebr-tracklist-toolbar-scroll";
	scrollContainer.style.cssText =
		"overflow-x: auto; max-width: 100%; margin-bottom: .5em;";
	scrollContainer.tabIndex = 0;
	scrollContainer.setAttribute("role", "region");
	scrollContainer.setAttribute("aria-label", "Tracklist controls");
	const actions = document.createElement("div");
	actions.append(addTrack, clearAll, lengthClear);
	const viewControls = document.createElement("div");
	viewControls.append("[", simple, "|", advanced, "]", insertLink);

	for (const [index, group] of [
		actions,
		viewControls,
		caseControls,
	].entries()) {
		group.style.cssText =
			"display: flex; align-items: center; gap: .35em; flex-shrink: 0;";
		if (index > 0) {
			group.style.borderLeft = "1px solid var(--mono-d)";
			group.style.paddingLeft = ".5em";
		}
		for (const button of group.children) {
			if (button instanceof HTMLElement) {
				button.style.margin = "0";
				button.style.whiteSpace = "nowrap";
				button.style.flexShrink = "0";
			}
		}
		toolbar.append(group);
	}
	scrollContainer.append(toolbar);
	toolbarTable.before(scrollContainer);
	toolbarRow.remove();
}
