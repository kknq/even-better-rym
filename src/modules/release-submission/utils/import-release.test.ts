// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";

import { fill } from "./fill";
import { importRelease } from "./import-release";
import type { ReleaseOptions } from "./types";

vi.mock("./fill", () => ({ fill: vi.fn() }));
vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("./page-functions", async (importOriginal) => ({
	...(await importOriginal<typeof import("./page-functions")>()),
	closeShortcutPopup: vi.fn().mockResolvedValue(undefined),
}));
afterEach(() => vi.restoreAllMocks());

const options: ReleaseOptions = {
	capitalization: "as-is",
	preserveTrackLengths: false,
	fillFields: {
		artists: true,
		tracks: true,
		type: false,
		date: false,
		title: false,
		format: false,
		discSize: false,
		label: true,
		attributes: false,
		countries: false,
		credits: true,
	},
};

test("resets old pickers before filling and starts new pickers only after completion", async () => {
	const events: string[] = [];
	let finish: (() => void) | undefined;
	vi.mocked(fill).mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				finish = () => {
					document.body.textContent = "imported tracks";
					resolve();
				};
			}),
	);
	const reset = () => {
		events.push("reset");
	};
	const complete = () => {
		events.push(document.body.textContent ?? "");
	};
	document.addEventListener("importEvent", reset);
	document.addEventListener("importCompleteEvent", complete);
	try {
		const importing = importRelease(
			{
				label: { id: 897 },
				tracks: [{ position: "1", title: "New" }],
			},
			options,
		);
		await vi.waitFor(() => expect(fill).toHaveBeenCalled());
		expect(events).toEqual(["reset"]);
		finish?.();
		await importing;
		expect(events).toEqual(["reset", "imported tracks"]);
	} finally {
		document.removeEventListener("importEvent", reset);
		document.removeEventListener("importCompleteEvent", complete);
	}
});

test("does not start pickers for a failed import and permits the next import", async () => {
	const complete = vi.fn();
	document.addEventListener("importCompleteEvent", complete);
	try {
		vi.mocked(fill)
			.mockRejectedValueOnce(new Error("fill failed"))
			.mockResolvedValue(undefined);
		await expect(importRelease({}, options)).rejects.toThrow("fill failed");
		expect(complete).not.toHaveBeenCalled();
		await importRelease({}, options);
		expect(complete).toHaveBeenCalledOnce();
	} finally {
		document.removeEventListener("importCompleteEvent", complete);
	}
});
