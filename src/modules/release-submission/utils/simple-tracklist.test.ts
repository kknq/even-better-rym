import { describe, expect, test, vi } from "vitest";

const advancedInput = vi.hoisted(() => ({ value: "" }));

vi.mock("~/shared/utils/dom", () => ({
	forceQuerySelector: () => () => advancedInput,
}));
vi.mock("./page-functions", () => ({
	showAdvancedTracklist: vi.fn(() => Promise.resolve()),
	showSimpleTracklist: vi.fn(() => Promise.resolve()),
}));
vi.stubGlobal("document", {});

import {
	editAdvancedTracklist,
	isTracklistEditPending,
	waitForTracklistEdits,
} from "./simple-tracklist";

describe("editAdvancedTracklist", () => {
	test("runs each edit on the text the previous one left", async () => {
		advancedInput.value = "a";
		void editAdvancedTracklist((text) => `${text}b`);
		await editAdvancedTracklist((text) => `${text}c`);

		expect(advancedInput.value).toBe("abc");
	});
});

describe("isTracklistEditPending", () => {
	test("is true from when an edit is queued until it finishes", async () => {
		const edit = editAdvancedTracklist((text) => text);

		expect(isTracklistEditPending()).toBe(true);
		await edit;
		expect(isTracklistEditPending()).toBe(false);
	});

	test("is false after an edit fails", async () => {
		const edit = editAdvancedTracklist(() => {
			throw new Error("edit failed");
		});

		await expect(edit).rejects.toThrow("edit failed");
		expect(isTracklistEditPending()).toBe(false);
	});
});

describe("waitForTracklistEdits", () => {
	test("resolves once the edits queued before it have finished", async () => {
		advancedInput.value = "";
		void editAdvancedTracklist(() => "filled");
		await waitForTracklistEdits();

		expect(advancedInput.value).toBe("filled");
		expect(isTracklistEditPending()).toBe(false);
	});
});
