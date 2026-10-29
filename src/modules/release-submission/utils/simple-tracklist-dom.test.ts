// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";

import { showAdvancedTracklist, showSimpleTracklist } from "./page-functions";
import {
	watchTracklistEdits,
	watchTracklistRows,
	writeTracklistText,
} from "./simple-tracklist";

vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("./page-functions", () => ({
	showAdvancedTracklist: vi.fn(),
	showSimpleTracklist: vi.fn(),
}));
afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

test("updates advanced text without changing editor mode", async () => {
	document.body.innerHTML =
		'<div id="tracks_adv"><textarea id="track_advanced">1|Old|</textarea></div>';
	await writeTracklistText("1|New|");
	expect(document.querySelector("textarea")?.value).toBe("1|New|");
	expect(showAdvancedTracklist).not.toHaveBeenCalled();
	expect(showSimpleTracklist).not.toHaveBeenCalled();
});

test("missing row/editor markup is reported without throwing in effects", () => {
	const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	const stopRows = watchTracklistRows(vi.fn());
	const stopEdits = watchTracklistEdits(vi.fn());
	stopRows();
	stopEdits();
	expect(warn).toHaveBeenCalledTimes(2);
});
