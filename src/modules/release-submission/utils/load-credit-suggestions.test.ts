import { afterEach, expect, test, vi } from "vitest";
import { resolveSongCredits } from "~/shared/services/applemusic/credits";
import { loadCreditSuggestions } from "./load-credit-suggestions";

vi.mock("~/shared/services/applemusic/credits", () => ({
	resolveSongCredits: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());

test("fetches each unique song once, keeping track order and existing metadata", async () => {
	vi.mocked(resolveSongCredits).mockResolvedValue([
		{ name: "A", role: "producer" },
	]);
	const tracks = [
		{
			position: "1",
			creditsUrl: "one",
			credits: [{ name: "B", role: "vocals" }],
		},
		{ position: "2", creditsUrl: "one" },
	];
	const result = await loadCreditSuggestions(tracks, {
		isActive: () => true,
		onProgress: vi.fn(),
	});
	expect(resolveSongCredits).toHaveBeenCalledOnce();
	expect(result.tracks[0]?.credits).toHaveLength(2);
	expect(result.tracks[1]?.credits).toEqual([{ name: "A", role: "producer" }]);
	expect(tracks[0]?.credits).toHaveLength(1);
});

test("limits concurrent requests and does not start more after cancellation", async () => {
	let active = true;
	let finish: (() => void) | undefined;
	const inFlight = new Promise<[]>((resolve) => {
		finish = () => resolve([]);
	});
	vi.mocked(resolveSongCredits).mockReturnValue(inFlight);
	const pending = loadCreditSuggestions(
		Array.from({ length: 6 }, (_, index) => ({ creditsUrl: `url${index}` })),
		{ isActive: () => active, onProgress: vi.fn() },
	);
	expect(resolveSongCredits).toHaveBeenCalledTimes(3);
	active = false;
	finish?.();
	await pending;
	expect(resolveSongCredits).toHaveBeenCalledTimes(3);
});

test("keeps usable metadata and identifies failed tracks explicitly", async () => {
	vi.mocked(resolveSongCredits).mockRejectedValue(new Error("Unavailable"));
	const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	try {
		const result = await loadCreditSuggestions(
			[{ position: "B2", title: "Track (feat. Guest)", creditsUrl: "failed" }],
			{ isActive: () => true, onProgress: vi.fn() },
		);
		expect(result.failedPositions).toEqual(["B2"]);
		expect(result.tracks[0]?.title).toBe("Track (feat. Guest)");
		expect(warn).toHaveBeenCalledOnce();
	} finally {
		warn.mockRestore();
	}
});
