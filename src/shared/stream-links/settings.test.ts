import { beforeEach, describe, expect, test, vi } from "vitest";

import * as storage from "../utils/storage";
import {
	defaultStreamLinkColors,
	defaultStreamLinkSettings,
	getStreamLinkSettings,
	setStreamLinkSettings,
} from "./settings";

vi.mock("../utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));

beforeEach(() => {
	vi.resetAllMocks();
});

describe("stream link settings", () => {
	test("defaults to grey icons with branding colors ready to enable", async () => {
		vi.mocked(storage.get).mockResolvedValue(undefined);
		await expect(getStreamLinkSettings()).resolves.toEqual(
			defaultStreamLinkSettings,
		);
		expect(defaultStreamLinkColors.spotify).toBe("#1db954");
		expect(defaultStreamLinkColors.soundcloud).toBe("#ff5500");
	});

	test("merges partial settings with new defaults and rejects invalid colors", async () => {
		vi.mocked(storage.get).mockResolvedValue({
			useServiceColors: true,
			colors: { spotify: "#123ABC", soundcloud: "orange", youtube: null },
		});
		await expect(getStreamLinkSettings()).resolves.toEqual({
			useServiceColors: true,
			colors: { ...defaultStreamLinkColors, spotify: "#123ABC" },
			searchUnvotedLinks: true,
			hideDownvotedLinks: false,
		});
	});

	test("searches unvoted links unless explicitly turned off", async () => {
		vi.mocked(storage.get).mockResolvedValueOnce({
			searchUnvotedLinks: false,
		});
		await expect(getStreamLinkSettings()).resolves.toMatchObject({
			searchUnvotedLinks: false,
		});

		vi.mocked(storage.get).mockResolvedValueOnce({
			searchUnvotedLinks: "false",
		});
		await expect(getStreamLinkSettings()).resolves.toMatchObject({
			searchUnvotedLinks: true,
		});
	});

	test("hides downvoted links only when explicitly turned on", async () => {
		vi.mocked(storage.get).mockResolvedValueOnce({
			hideDownvotedLinks: true,
		});
		await expect(getStreamLinkSettings()).resolves.toMatchObject({
			hideDownvotedLinks: true,
		});

		vi.mocked(storage.get).mockResolvedValueOnce({
			hideDownvotedLinks: "true",
		});
		await expect(getStreamLinkSettings()).resolves.toMatchObject({
			hideDownvotedLinks: false,
		});
	});

	test("does not enable colors for an invalid stored flag", async () => {
		vi.mocked(storage.get).mockResolvedValue({ useServiceColors: "true" });
		await expect(getStreamLinkSettings()).resolves.toEqual(
			defaultStreamLinkSettings,
		);
	});

	test("persists custom colors even when disabled", async () => {
		const settings = {
			useServiceColors: false,
			colors: { ...defaultStreamLinkColors, spotify: "#445566" },
			searchUnvotedLinks: true,
			hideDownvotedLinks: false,
		};
		vi.mocked(storage.set).mockResolvedValue(undefined);
		await setStreamLinkSettings(settings);
		expect(storage.set).toHaveBeenCalledWith("streamLinks.settings", settings);
	});
});
