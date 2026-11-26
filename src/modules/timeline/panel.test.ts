// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vitest";
import {
	extractDiscographyMarkersFromDOM,
	extractShowMarkersFromDOM,
	readFormedAndDisbanded,
} from "./discography";
import { buildGraph } from "./graph";
import { togglePanel } from "./panel";
import type { MarkersByType } from "./types";

vi.mock("./discography", () => ({
	extractDiscographyMarkersFromDOM: vi.fn(),
	extractShowMarkersFromDOM: vi.fn(),
	openPastShows: vi.fn(),
	readFormedAndDisbanded: vi.fn(),
}));
vi.mock("./dom-helpers", () => ({
	findAdjacentInfoContent: () => null,
	insertPanelAfterLastRenderedTextArtist: () => false,
}));
vi.mock("./graph", () => ({
	buildGraph: vi.fn(),
	attachGraphInteractivity: vi.fn(),
}));
vi.mock("./theme", () => ({ applyRymThemeVars: vi.fn() }));
vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));
vi.mock("~/shared/utils/storage", () => ({
	get: vi.fn(),
	set: vi.fn(),
}));

const markers: MarkersByType = {
	album: [],
	live: [],
	single: [],
	ep: [],
	additional: [],
	show: [],
};

beforeEach(() => {
	vi.resetAllMocks();
	document.body.innerHTML = '<div id="content"></div>';
	vi.mocked(extractDiscographyMarkersFromDOM).mockResolvedValue(markers);
	vi.mocked(extractShowMarkersFromDOM).mockResolvedValue([]);
	vi.mocked(readFormedAndDisbanded).mockReturnValue({
		formedDate: null,
		disbandedDate: null,
	});
});

test("uses partial formed and disbanded dates as timeline bounds", async () => {
	vi.mocked(readFormedAndDisbanded).mockReturnValue({
		formedDate: null,
		disbandedDate: null,
		formedLabel: "1990",
		disbandedLabel: "2020",
	});
	togglePanel(null);
	await vi.waitFor(() => expect(buildGraph).toHaveBeenCalledOnce());
	const options = vi.mocked(buildGraph).mock.calls[0][2];
	expect(options?.formedYear).toBe(1990);
	expect(options?.disbandedYear).toBeGreaterThan(2020.99);
	expect(options?.disbandedYear).toBeLessThan(2021);
	expect(options?.endYear).toBe(options?.disbandedYear);
	expect(options?.axisStartLabel).toBe("1990");
	expect(options?.axisEndLabel).toBe("2020");
	expect(extractDiscographyMarkersFromDOM).toHaveBeenCalledWith(
		options?.disbandedYear,
	);
	expect(extractShowMarkersFromDOM).toHaveBeenCalledWith(
		options?.disbandedYear,
	);
});

test("keeps full dates exact and extends active bands to the current date", async () => {
	vi.mocked(readFormedAndDisbanded).mockReturnValue({
		formedDate: new Date(1990, 5, 15),
		disbandedDate: null,
	});
	togglePanel(null);
	await vi.waitFor(() => expect(buildGraph).toHaveBeenCalledOnce());
	const options = vi.mocked(buildGraph).mock.calls[0][2];
	expect(options?.formedYear).toBeGreaterThan(1990);
	expect(options?.axisStartLabel).toBe("15 Jun 1990");
	expect(options?.disbandedYear).toBeNull();
	expect(options?.axisEndLabel).toBe("Now");
	expect(options?.endYear).toBeGreaterThanOrEqual(new Date().getFullYear());
	expect(extractDiscographyMarkersFromDOM).toHaveBeenCalledWith(null);
});

test("waits for complete discography data before drawing the timeline", async () => {
	let finish: ((value: MarkersByType) => void) | undefined;
	vi.mocked(extractDiscographyMarkersFromDOM).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	togglePanel(null);
	await vi.waitFor(() => {
		expect(extractDiscographyMarkersFromDOM).toHaveBeenCalledOnce();
	});
	expect(document.querySelector("#rymmt-panel")?.textContent).toBe(
		"Loading timeline...",
	);
	expect(buildGraph).not.toHaveBeenCalled();
	finish?.(markers);
	await vi.waitFor(() => {
		expect(buildGraph).toHaveBeenCalledOnce();
	});
	expect(
		document.querySelector("#rymmt-panel")?.getAttribute("aria-busy"),
	).toBe("false");
});

test("reports incomplete loading and retries instead of rendering partial markers", async () => {
	const log = vi.spyOn(console, "error").mockReturnValue(undefined);
	vi.mocked(extractDiscographyMarkersFromDOM).mockRejectedValueOnce(
		new Error("Offline"),
	);
	togglePanel(null);
	await vi.waitFor(() => {
		expect(document.querySelector("#rymmt-panel button")).not.toBeNull();
	});
	expect(buildGraph).not.toHaveBeenCalled();
	expect(document.querySelector("#rymmt-panel")?.textContent).toContain(
		"Could not load the complete timeline",
	);
	document.querySelector<HTMLButtonElement>("#rymmt-panel button")?.click();
	await vi.waitFor(() => {
		expect(buildGraph).toHaveBeenCalledOnce();
	});
	expect(log).toHaveBeenCalled();
	log.mockRestore();
});
