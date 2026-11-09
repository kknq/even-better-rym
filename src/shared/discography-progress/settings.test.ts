import { beforeEach, expect, test, vi } from "vitest";
import browser from "webextension-polyfill";
import * as storage from "~/shared/utils/storage";
import {
	getHideZeroCoverage,
	getSelectedTypes,
	setHideZeroCoverage,
	setSelectedTypes,
	watchHideZeroCoverage,
	watchSelectedTypes,
} from "./settings";

vi.mock("webextension-polyfill", () => ({
	default: {
		storage: {
			onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
		},
	},
}));
vi.mock("~/shared/utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

test("includes only albums, EPs and mixtapes by default", async () => {
	expect(await getSelectedTypes()).toEqual(new Set(["s", "e", "m"]));
});

test.each([
	undefined,
	null,
	false,
	"true",
	1,
])("shows zero coverage by default and ignores invalid stored values: %s", async (stored) => {
	vi.mocked(storage.get).mockResolvedValue(stored);
	expect(await getHideZeroCoverage()).toBe(false);
});

test("persists and restores hiding zero coverage without changing selected types", async () => {
	await setHideZeroCoverage(true);
	expect(storage.set).toHaveBeenCalledExactlyOnceWith(
		"discography-progress.hide-zero-coverage",
		true,
	);
	vi.mocked(storage.get).mockResolvedValue(true);
	expect(await getHideZeroCoverage()).toBe(true);
	await setHideZeroCoverage(false);
	expect(storage.set).toHaveBeenLastCalledWith(
		"discography-progress.hide-zero-coverage",
		false,
	);
});

test("updates zero coverage visibility on local changes and restores the default on removal", () => {
	const changed = vi.fn();
	const stop = watchHideZeroCoverage(changed);
	const listener = vi.mocked(browser.storage.onChanged.addListener).mock
		.calls[0][0];
	listener(
		{ "discography-progress.hide-zero-coverage": { newValue: true } },
		"sync",
	);
	listener({ "discography-progress.types": { newValue: [] } }, "local");
	expect(changed).not.toHaveBeenCalled();
	listener(
		{ "discography-progress.hide-zero-coverage": { newValue: true } },
		"local",
	);
	expect(changed).toHaveBeenLastCalledWith(true);
	listener({ "discography-progress.hide-zero-coverage": {} }, "local");
	expect(changed).toHaveBeenLastCalledWith(false);
	stop();
	expect(browser.storage.onChanged.removeListener).toHaveBeenCalledWith(
		listener,
	);
});

test("notifies open pages about local selection changes and restored defaults", () => {
	const changed = vi.fn();
	const stop = watchSelectedTypes(changed);
	const listener = vi.mocked(browser.storage.onChanged.addListener).mock
		.calls[0][0];
	listener({ "discography-progress.types": { newValue: ["j"] } }, "sync");
	listener({ other: { newValue: ["j"] } }, "local");
	expect(changed).not.toHaveBeenCalled();
	listener({ "discography-progress.types": { newValue: ["j"] } }, "local");
	expect(changed).toHaveBeenLastCalledWith(new Set(["j"]));
	listener({ "discography-progress.types": {} }, "local");
	expect(changed).toHaveBeenLastCalledWith(new Set(["s", "e", "m"]));
	stop();
	expect(browser.storage.onChanged.removeListener).toHaveBeenCalledWith(
		listener,
	);
});

test("preserves empty choices and removes unknown release types", async () => {
	vi.mocked(storage.get).mockResolvedValueOnce([]);
	expect(await getSelectedTypes()).toEqual(new Set());
	vi.mocked(storage.get).mockResolvedValueOnce(["s", "e", "unknown"]);
	expect(await getSelectedTypes()).toEqual(new Set(["s", "e"]));
});

test("persists choices across artists", async () => {
	await setSelectedTypes(new Set(["s", "l"]));
	expect(storage.set).toHaveBeenCalledWith("discography-progress.types", [
		"s",
		"l",
	]);
});

test("preserves saved mixtape and DJ mix choices", async () => {
	vi.mocked(storage.get).mockResolvedValueOnce(["m", "j"]);
	const selected = await getSelectedTypes();
	expect(selected).toEqual(new Set(["m", "j"]));
	await setSelectedTypes(selected);
	expect(storage.set).toHaveBeenCalledWith("discography-progress.types", [
		"m",
		"j",
	]);
});
