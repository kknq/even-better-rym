import { beforeEach, expect, test, vi } from "vitest";
import browser from "webextension-polyfill";
import * as storage from "~/shared/utils/storage";
import {
	defaultSectionOrder,
	getSectionOrder,
	parseSectionOrder,
	resetSectionOrder,
	setSectionOrder,
	watchSectionOrder,
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
	remove: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

test("uses RYM's section order by default", async () => {
	expect(await getSectionOrder()).toEqual([
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
		"x",
	]);
});

test("restores a saved order", async () => {
	const saved = ["x", ...defaultSectionOrder.filter((type) => type !== "x")];
	vi.mocked(storage.get).mockResolvedValue(saved);
	expect(await getSectionOrder()).toEqual(saved);
});

test("drops invalid and duplicate entries and inserts missing types after their default predecessor", () => {
	expect(
		parseSectionOrder(["x", "s", "s", "unknown", 3, "i", "l", "e", "m"]),
	).toEqual(["x", "s", "i", "o", "j", "a", "c", "v", "b", "d", "l", "e", "m"]);
	expect(parseSectionOrder("x")).toEqual(defaultSectionOrder);
});

test("persists and resets the order", async () => {
	await setSectionOrder(["x", "i"]);
	expect(storage.set).toHaveBeenCalledExactlyOnceWith(
		"discography-order.types",
		["x", "i"],
	);
	await resetSectionOrder();
	expect(storage.remove).toHaveBeenCalledExactlyOnceWith(
		"discography-order.types",
	);
});

test("notifies about local order changes and restored defaults", () => {
	const changed = vi.fn();
	const stop = watchSectionOrder(changed);
	const listener = vi.mocked(browser.storage.onChanged.addListener).mock
		.calls[0][0];
	listener({ "discography-order.types": { newValue: ["x"] } }, "sync");
	listener({ other: { newValue: ["x"] } }, "local");
	expect(changed).not.toHaveBeenCalled();
	const saved = ["x", ...defaultSectionOrder.filter((type) => type !== "x")];
	listener({ "discography-order.types": { newValue: saved } }, "local");
	expect(changed).toHaveBeenLastCalledWith(saved);
	listener({ "discography-order.types": {} }, "local");
	expect(changed).toHaveBeenLastCalledWith(defaultSectionOrder);
	stop();
	expect(browser.storage.onChanged.removeListener).toHaveBeenCalledWith(
		listener,
	);
});
