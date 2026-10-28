import { forceQuerySelector, waitForDocumentReady } from "~/shared/utils/dom";

const locations = [
	["o", "place of origin"],
	["c", "current location"],
	["r", "relevant location"],
] as const;

export async function main(): Promise<void> {
	await waitForDocumentReady();
	const form = document.querySelector<HTMLFormElement>("form#artist_ac");
	if (!form) return;

	for (const [prefix, label] of locations) {
		if (form.querySelector(`[data-ebr-clear-location="${prefix}"]`)) continue;

		const city = forceQuerySelector<HTMLInputElement>(form)(`#${prefix}_city`);
		const state = forceQuerySelector<HTMLInputElement>(form)(
			`#${prefix}_state`,
		);
		const country = forceQuerySelector<HTMLSelectElement>(form)(
			`#${prefix}_country`,
		);
		const relevance = form.querySelector<HTMLInputElement>(
			`#${prefix}_is_relevant_loc`,
		);

		const button = document.createElement("button");
		button.type = "button";
		button.className = "btn blue_btn btn_small";
		button.textContent = "clear location";
		button.title = `Clear ${label}`;
		button.setAttribute("aria-label", button.title);
		button.dataset.ebrClearLocation = prefix;
		button.style.marginLeft = "0.5em";
		button.style.paddingBlock = "0";
		button.style.lineHeight = "1";
		button.addEventListener("click", () => {
			for (const field of [city, state, country]) field.value = "";
			if (relevance) relevance.checked = false;

			for (const field of [city, state, country, relevance]) {
				if (!field) continue;
				field.dispatchEvent(new Event("input", { bubbles: true }));
				field.dispatchEvent(new Event("change", { bubbles: true }));
			}
		});
		const controls = document.createElement("span");
		controls.style.display = "inline-flex";
		controls.style.alignItems = "stretch";
		controls.style.verticalAlign = "middle";
		city.before(controls);
		controls.append(city, button);
	}
}
