import { beforeEach, describe, expect, test, vi } from "vitest";

import * as storage from "~/shared/utils/storage";

import {
	defaultUserPageSettings,
	getUserPageSettings,
	mergeUserPageSettings,
	setUserPageSettings,
} from "./settings";

vi.mock("~/shared/utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));

beforeEach(() => {
	vi.resetAllMocks();
});

describe("user page settings", () => {
	test("keeps both existing features enabled by default", async () => {
		expect(defaultUserPageSettings()).toEqual({
			followStatus: true,
			editBoxes: true,
		});
		expect(await getUserPageSettings()).toEqual(defaultUserPageSettings());
	});

	test.each([
		{ followStatus: false },
		{ editBoxes: false },
	])("merges partial preferences without losing defaults (%j)", (overrides) => {
		expect(mergeUserPageSettings(overrides)).toEqual({
			...defaultUserPageSettings(),
			...overrides,
		});
	});

	test("reads persisted preferences and saves both independent switches", async () => {
		vi.mocked(storage.get).mockResolvedValue({ followStatus: false });
		expect(await getUserPageSettings()).toEqual({
			followStatus: false,
			editBoxes: true,
		});
		await setUserPageSettings({ followStatus: true, editBoxes: false });
		expect(storage.set).toHaveBeenCalledWith("brym.userPageSettings", {
			followStatus: true,
			editBoxes: false,
		});
	});
});
