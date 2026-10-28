// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import injectDateControls from "./date-controls";

vi.mock("~/shared/utils/dom", () => ({
	waitForElement: vi.fn((selector: string) => {
		const element = document.querySelector(selector);
		if (!element) throw new Error(`Could not find element: ${selector}`);
		return Promise.resolve(element);
	}),
}));

vi.mock("../utils/fillers", () => ({
	fillDate: vi.fn(),
}));

const releaseDateIds = ["month", "day", "year"];
const recordingDateIds = [
	"rec_from_month",
	"rec_from_day",
	"rec_from_year",
	"rec_to_month",
	"rec_to_day",
	"rec_to_year",
];
const dateIds = [...releaseDateIds, ...recordingDateIds];

function createDateSelect(id: string): HTMLSelectElement {
	const select = document.createElement("select");
	select.id = id;
	select.innerHTML = '<option value="00"></option><option value="01"></option>';
	select.value = "01";
	return select;
}

async function addDateControls(): Promise<void> {
	const form = document.createElement("form");
	form.append(...dateIds.map(createDateSelect), document.createElement("div"));
	document.body.replaceChildren(form);

	await injectDateControls();
}

describe("release submission date clear controls", () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	test("clears only the release date dropdowns", async () => {
		await addDateControls();

		const button = document.querySelector<HTMLInputElement>(
			"#year + span input[value=Clear]",
		);
		expect(button).not.toBeNull();
		button?.click();

		for (const id of releaseDateIds) {
			expect(document.getElementById(id)).toHaveProperty("value", "00");
		}
		for (const id of recordingDateIds) {
			expect(document.getElementById(id)).toHaveProperty("value", "01");
		}
	});

	test("clears both recording date ranges and emits change events", async () => {
		await addDateControls();

		const changedIds: string[] = [];
		document.addEventListener("change", (event) => {
			changedIds.push((event.target as HTMLSelectElement).id);
		});

		const button = document.querySelector<HTMLInputElement>(
			"#rec_to_year + div input[value=Clear]",
		);
		expect(button).not.toBeNull();
		button?.click();

		for (const id of recordingDateIds) {
			expect(document.getElementById(id)).toHaveProperty("value", "00");
		}
		for (const id of releaseDateIds) {
			expect(document.getElementById(id)).toHaveProperty("value", "01");
		}
		expect(changedIds).toEqual(recordingDateIds);
	});
});
