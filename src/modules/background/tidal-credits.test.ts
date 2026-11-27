import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readHiddenTidalCredits } from "~/modules/tidal-credits/hidden-credits";
import { isTidalCreditsResult } from "~/shared/services/tidal/credits-page";
import type { TidalCreditsRequest } from "~/shared/utils/messaging";
import { readHiddenPage } from "./hidden-page";
import { tidalCredits } from "./tidal-credits";

vi.mock("./hidden-page", () => ({ readHiddenPage: vi.fn() }));
vi.mock("~/modules/tidal-credits/hidden-credits", () => ({
	readHiddenTidalCredits: vi.fn(),
}));

const request: TidalCreditsRequest = {
	id: "request",
	type: "tidalCredits",
	data: { albumId: "123", trackIds: ["101", "102"] },
};
const result = {
	tracks: [
		{ id: "101", credits: [{ name: "Writer", role: "Composer" }] },
		{ id: "102", credits: [] },
	],
};
const removeBrowsingData = vi.fn();
beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("chrome", {
		browsingData: { remove: removeBrowsingData },
	});
	removeBrowsingData.mockReset().mockResolvedValue(undefined);
	vi.mocked(readHiddenPage).mockResolvedValue(result);
	vi.mocked(readHiddenTidalCredits).mockResolvedValue(result);
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

test("uses the shared invisible reader with Tidal-only framing and validated results", async () => {
	await expect(tidalCredits(request)).resolves.toEqual({
		id: "request",
		type: "tidalCredits",
		data: result,
	});
	const job = vi.mocked(readHiddenPage).mock.calls[0]?.[0];
	if (!job) throw new Error("Missing hidden page job");
	expect(job.frameUrlPrefix).toBe("https://tidal.com/album/");
	expect(job.message).toEqual({
		type: "ebr-tidal-offscreen",
		data: request.data,
	});
	expect(job.isResult).toBe(isTidalCreditsResult);
	await job.prepareOffscreen?.();
	expect(removeBrowsingData).toHaveBeenCalledExactlyOnceWith(
		{ origins: ["https://tidal.com"] },
		{ serviceWorkers: true },
	);
	await expect(job.readBackground()).resolves.toEqual(result);
	expect(readHiddenTidalCredits).toHaveBeenCalledExactlyOnceWith(request.data);
});

test("surfaces invisible-reader failures without falling back to tabs", async () => {
	vi.mocked(readHiddenPage).mockRejectedValueOnce(
		new Error("Offscreen unavailable"),
	);
	await expect(tidalCredits(request)).resolves.toHaveProperty(
		"data.error",
		"Offscreen unavailable",
	);
	expect(readHiddenPage).toHaveBeenCalledOnce();
});

test.each([
	{ albumId: "../other", trackIds: ["101"] },
	{ albumId: "123", trackIds: [] },
	{ albumId: "123", trackIds: ["101", "101"] },
	{ albumId: "123", trackIds: ["bad"] },
])("rejects invalid requests without loading a frame: %j", async (data) => {
	await expect(tidalCredits({ ...request, data })).resolves.toHaveProperty(
		"data.error",
		"Invalid Tidal credits request",
	);
	expect(readHiddenPage).not.toHaveBeenCalled();
	expect(removeBrowsingData).not.toHaveBeenCalled();
});

test("continues when scoped service worker removal is unavailable", async () => {
	vi.stubGlobal("chrome", {});
	await tidalCredits(request);
	const job = vi.mocked(readHiddenPage).mock.calls[0]?.[0];
	if (!job?.prepareOffscreen) throw new Error("Missing preparation");
	await expect(job.prepareOffscreen()).resolves.toBeUndefined();
	expect(console.warn).toHaveBeenCalledWith(
		"EvenBetterRYM: Tidal service worker removal is unavailable; continuing with credits import",
	);
});
