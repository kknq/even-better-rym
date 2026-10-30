import { beforeEach, describe, expect, test, vi } from "vitest";

import * as storage from "../utils/storage";
import {
	defaultReferenceLinkSettings,
	getReferenceLinkSettings,
	setReferenceLinkSettings,
} from "./settings";

vi.mock("../utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));

describe("reference link settings", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test("returns defaults when no settings are stored", async () => {
		vi.mocked(storage.get).mockResolvedValue(undefined);

		await expect(getReferenceLinkSettings()).resolves.toEqual(
			defaultReferenceLinkSettings,
		);
	});

	test("uses defaults for invalid stored colors and preserves valid colors", async () => {
		vi.mocked(storage.get).mockResolvedValue({
			buttonColor: "blue",
		});

		await expect(getReferenceLinkSettings()).resolves.toEqual({
			buttonColor: defaultReferenceLinkSettings.buttonColor,
		});
	});

	test("stores the selected colors", async () => {
		const settings = {
			buttonColor: "#445566",
		};
		vi.mocked(storage.set).mockResolvedValue(undefined);

		await expect(setReferenceLinkSettings(settings)).resolves.toBeUndefined();
		expect(storage.set).toHaveBeenCalledWith(
			"referenceLinks.settings",
			settings,
		);
	});
});
