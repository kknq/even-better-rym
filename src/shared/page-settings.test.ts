import { beforeEach, expect, test, vi } from "vitest";

import {
	getAllModulesEnabled,
	getModuleEnabled,
	runModule,
	setModuleEnabled,
} from "./page-settings";
import { featureGroups } from "./pages";
import * as storage from "./utils/storage";

const saved = vi.hoisted(() => new Map<string, unknown>());
vi.mock("./utils/storage", () => ({
	get: vi.fn((key: string) => Promise.resolve(saved.get(key))),
	getAll: vi.fn(() => Promise.resolve(Object.fromEntries(saved))),
	set: vi.fn((key: string, value: unknown) => {
		saved.set(key, value);
		return Promise.resolve();
	}),
}));

beforeEach(() => {
	saved.clear();
	vi.clearAllMocks();
});

test("preserves saved release switches when reorganizing popup groups", async () => {
	const groups = featureGroups.filter(([label]) =>
		["Release Page", "Release Submission Tools"].includes(label),
	);
	const keys = groups
		.flatMap(([, features]) => [...features])
		.filter((key) => key !== "albumIdCopy");
	for (const [index, key] of keys.entries()) {
		saved.set(`pages.${key}`, index % 2 === 0);
	}
	const original = new Map(saved);
	const enabled = await getAllModulesEnabled();
	expect(enabled.albumIdCopy).toBe(true);
	expect(saved.has("pages.albumIdCopy")).toBe(false);
	for (const [index, key] of keys.entries()) {
		expect(enabled[key]).toBe(index % 2 === 0);
		expect(await getModuleEnabled(key)).toBe(index % 2 === 0);
	}
	expect(saved).toEqual(original);
	expect(storage.set).not.toHaveBeenCalled();
	expect(
		groups.find(([label]) => label === "Release Submission Tools")?.[1],
	).toEqual([
		"imageCropper",
		"coverArt",
		"releaseSubmission",
		"streamLinkSubmission",
	]);
	expect(groups.find(([label]) => label === "Release Page")?.[1]).toContain(
		"userReception",
	);
});

test("enables profile edits and follow status by default", async () => {
	expect(await getModuleEnabled("followStatus")).toBe(true);
	expect(await getModuleEnabled("userPage")).toBe(true);
	expect((await getAllModulesEnabled()).followStatus).toBe(true);
});

test("enables follow status independently of the old user-page module", async () => {
	saved.set("pages.userPage", false);
	const enabled = await getAllModulesEnabled();
	expect(enabled.followStatus).toBe(true);
	expect(enabled.userPage).toBe(false);
	expect(await getModuleEnabled("followStatus")).toBe(true);
});

test("ignores obsolete internal switches without migrating or writing settings", async () => {
	saved.set("brym.userPageSettings", { followStatus: false, editBoxes: false });
	expect(await getModuleEnabled("followStatus")).toBe(true);
	expect(await getModuleEnabled("userPage")).toBe(true);
	const enabled = await getAllModulesEnabled();
	expect(enabled.followStatus).toBe(true);
	expect(enabled.userPage).toBe(true);
	expect(storage.set).not.toHaveBeenCalled();
});

test("honors explicitly saved standalone switches", async () => {
	saved.set("pages.followStatus", true);
	saved.set("pages.userPage", false);
	saved.set("brym.userPageSettings", { followStatus: false, editBoxes: true });
	const enabled = await getAllModulesEnabled();
	expect(enabled.followStatus).toBe(true);
	expect(enabled.userPage).toBe(false);
	expect(storage.set).not.toHaveBeenCalled();
});

test("can toggle follow status independently of profile editing", async () => {
	saved.set("pages.userPage", false);
	await setModuleEnabled("followStatus", true);
	expect(await getModuleEnabled("followStatus")).toBe(true);
	expect(await getModuleEnabled("userPage")).toBe(false);
	await setModuleEnabled("userPage", true);
	await setModuleEnabled("followStatus", false);
	expect(await getModuleEnabled("userPage")).toBe(true);
	expect(await getModuleEnabled("followStatus")).toBe(false);
});

test("the standalone switch gates the module callback", async () => {
	const callback = vi.fn();
	await setModuleEnabled("followStatus", false);
	await runModule("followStatus", callback);
	expect(callback).not.toHaveBeenCalled();
	await setModuleEnabled("followStatus", true);
	await runModule("followStatus", callback);
	expect(callback).toHaveBeenCalledOnce();
});

test("retains other module settings and defaults", async () => {
	saved.set("pages.searchFocus", false);
	const enabled = await getAllModulesEnabled();
	expect(enabled.searchFocus).toBe(false);
	expect(enabled.hideReviews).toBe(false);
	expect(enabled.hideRatings).toBe(true);
	expect(await getModuleEnabled("hideCommentBoxes")).toBe(false);
	expect(enabled.discographyOrder).toBe(false);
});

test("derives section ordering enablement from the order, ignoring the old switch", async () => {
	saved.set("pages.discographyOrder", true);
	expect(await getModuleEnabled("discographyOrder")).toBe(false);
	expect((await getAllModulesEnabled()).discographyOrder).toBe(false);
	saved.set("pages.discographyOrder", false);
	saved.set("discography-order.types", [
		"x",
		"s",
		"l",
		"m",
		"e",
		"i",
		"o",
		"j",
		"a",
		"c",
		"v",
		"b",
		"d",
	]);
	expect(await getModuleEnabled("discographyOrder")).toBe(true);
	expect((await getAllModulesEnabled()).discographyOrder).toBe(true);
	saved.delete("discography-order.types");
	expect(await getModuleEnabled("discographyOrder")).toBe(false);
});
