import { beforeEach, expect, test, vi } from "vitest";
import { withCache } from "./cache";
import * as storage from "./storage";

vi.mock("./storage", () => ({
	get: vi.fn(),
	getAll: vi.fn().mockResolvedValue({}),
	set: vi.fn().mockResolvedValue(undefined),
	remove: vi.fn(),
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(storage.get).mockResolvedValue(undefined);
});

test("does not cache partial results when the cache predicate rejects them", async () => {
	const resolve = vi
		.fn<(url: string) => Promise<{ warnings: string[] }>>()
		.mockResolvedValueOnce({ warnings: ["Lineup unavailable"] })
		.mockResolvedValueOnce({ warnings: [] });
	const cached = withCache(
		"test",
		resolve,
		undefined,
		(result) => !result.warnings.length,
	);
	await expect(cached("url")).resolves.toEqual({
		warnings: ["Lineup unavailable"],
	});
	expect(storage.set).not.toHaveBeenCalled();
	await expect(cached("url")).resolves.toEqual({ warnings: [] });
	expect(resolve).toHaveBeenCalledTimes(2);
	expect(storage.set).toHaveBeenCalledOnce();
});
