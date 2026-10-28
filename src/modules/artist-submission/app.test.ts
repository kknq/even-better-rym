// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { main } from "./app";

vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));

const prefixes = ["o", "c", "r"] as const;

function field(id: string): HTMLInputElement | HTMLSelectElement {
	const element = document.getElementById(id);
	if (
		!(element instanceof HTMLInputElement) &&
		!(element instanceof HTMLSelectElement)
	) {
		throw new Error(`Missing location field: ${id}`);
	}
	return element;
}

function button(prefix: string): HTMLButtonElement {
	const element = document.querySelector<HTMLButtonElement>(
		`[data-ebr-clear-location="${prefix}"]`,
	);
	if (!element) throw new Error(`Missing clear button: ${prefix}`);
	return element;
}

beforeEach(() => {
	// Field IDs and the optional relevance checkboxes match the saved artist form.
	document.body.innerHTML = `
		<form id="artist_ac" action="/artist/profile_ac_2">
			<input id="lastname" name="lastname" value="Artist">
			${prefixes
				.map(
					(prefix) => `
						<input id="${prefix}_city" name="${prefix}_city" value="Edinburgh">
						<input id="${prefix}_state" name="${prefix}_state" value="City of Edinburgh">
						<select id="${prefix}_country" name="${prefix}_country">
							<option value=""></option>
							<option value="GB" selected>United Kingdom</option>
						</select>
						${
							prefix === "r"
								? ""
								: `<input type="checkbox" id="${prefix}_is_relevant_loc"
										name="${prefix}_is_relevant_loc" value="true" checked>`
						}
					`,
				)
				.join("")}
		</form>`;
});

describe("artist location clear buttons", () => {
	it("adds accessible, non-submitting buttons without changing initial values", async () => {
		await main();

		expect(document.querySelectorAll("button")).toHaveLength(3);
		for (const prefix of prefixes) {
			expect(button(prefix).type).toBe("button");
			expect(button(prefix).textContent).toBe("clear location");
			expect(button(prefix).className).toBe("btn blue_btn btn_small");
			expect(button(prefix).getAttribute("aria-label")).toBe(
				button(prefix).title,
			);
			expect(field(`${prefix}_city`).value).toBe("Edinburgh");
			expect(field(`${prefix}_country`).value).toBe("GB");
		}
	});

	it.each(
		prefixes,
	)("clears only the %s location and its submitted values", async (prefix) => {
		await main();
		const form = document.querySelector<HTMLFormElement>("#artist_ac");
		if (!form) throw new Error("Missing artist form");
		const onSubmit = vi.fn();
		form.addEventListener("submit", onSubmit);

		button(prefix).click();

		const data = new FormData(form);
		for (const other of prefixes) {
			for (const suffix of ["city", "state", "country"]) {
				const id = `${other}_${suffix}`;
				if (other === prefix) {
					expect(field(id).value).toBe("");
					expect(data.get(id)).toBe("");
				} else {
					expect(field(id).value).not.toBe("");
				}
			}
			if (other !== "r") {
				expect(data.has(`${other}_is_relevant_loc`)).toBe(other !== prefix);
			}
		}
		expect(data.get("lastname")).toBe("Artist");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("stretches each button to the city field height without extra vertical padding", async () => {
		await main();

		for (const prefix of prefixes) {
			const city = field(`${prefix}_city`);
			const clear = button(prefix);
			expect(clear.parentElement).toBe(city.parentElement);
			expect(city.nextElementSibling).toBe(clear);
			expect(clear.parentElement?.style.display).toBe("inline-flex");
			expect(clear.parentElement?.style.alignItems).toBe("stretch");
			expect(clear.style.paddingBlock).toBe("0px");
			expect(clear.style.lineHeight).toBe("1");
		}
	});

	it("notifies page listeners after all location values have been cleared", async () => {
		await main();
		const onEvent = vi.fn(() => {
			for (const suffix of ["city", "state", "country"]) {
				expect(field(`o_${suffix}`).value).toBe("");
			}
		});
		const form = document.querySelector("#artist_ac");
		form?.addEventListener("input", onEvent);
		form?.addEventListener("change", onEvent);

		button("o").click();

		expect(onEvent).toHaveBeenCalledTimes(8);
	});

	it("does not duplicate buttons on repeated initialization", async () => {
		await main();
		await main();
		expect(document.querySelectorAll("button")).toHaveLength(3);
	});

	it("supports empty locations on a new artist submission", async () => {
		for (const input of document.querySelectorAll("input, select")) {
			if (input instanceof HTMLInputElement) {
				if (input.type === "checkbox") input.checked = false;
				else input.value = "";
			} else if (input instanceof HTMLSelectElement) input.value = "";
		}
		await main();
		for (const prefix of prefixes) {
			button(prefix).click();
			expect(field(`${prefix}_country`).value).toBe("");
		}
	});
});
