// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { isTidalCreditsResult, readTidalCreditsPage } from "./credits-page";

const person = (name: string) =>
	`<a data-test="grid-item-detail-text-title-artist">${name}</a>`;
const cell = (role: string, people: string) =>
	`<div class="_creditsCell_hash"><span data-uppercase="true">${role}</span><span>${people}</span></div>`;
const block = (id: string, credits?: string) =>
	`<div class="_credits_hash"><div><div data-test-id="${id}"></div></div>${credits === undefined ? "" : `<div class="_mediaCredits_hash">${credits}</div>`}</div>`;

beforeEach(() => {
	vi.stubGlobal("location", new URL("https://tidal.com/album/123/credits"));
	document.body.innerHTML = "<main></main>";
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

test("reads each person separately from source-shaped role cells without splitting names", async () => {
	document.querySelector("main")!.innerHTML = block(
		"101",
		cell(
			"Composer",
			person("Simon &amp; Garfunkel") + person("Composer, Jr."),
		) + cell("RapVocalist", person("Playboi Carti")),
	);
	await expect(readTidalCreditsPage("123", ["101"])).resolves.toEqual({
		tracks: [
			{
				id: "101",
				credits: [
					{ name: "Simon & Garfunkel", role: "Composer" },
					{ name: "Composer, Jr.", role: "Composer" },
					{ name: "Playboi Carti", role: "RapVocalist" },
				],
			},
		],
	});
});

test("waits for all requested source track IDs, regardless of rendered order", async () => {
	const read = readTidalCreditsPage("123", ["101", "102"]);
	let settled = false;
	void read.then(() => {
		settled = true;
	});
	document.querySelector("main")!.innerHTML = block(
		"102",
		cell("Producer", person("Other")),
	);
	await Promise.resolve();
	expect(settled).toBe(false);
	document
		.querySelector("main")!
		.insertAdjacentHTML(
			"beforeend",
			block("101", cell("Composer", person("Writer"))),
		);
	await expect(read).resolves.toMatchObject({
		tracks: [{ id: "102" }, { id: "101" }],
	});
});

test("accepts Northwind's rendered track blocks without credit bodies as genuinely empty", async () => {
	document.querySelector("main")!.innerHTML = block("101");
	await expect(readTidalCreditsPage("123", ["101"])).resolves.toEqual({
		tracks: [{ id: "101", credits: [] }],
	});
});

test.each([
	cell("", person("Name")),
	cell("Composer", ""),
	cell("Composer", person("")),
	"<div>Changed credit markup</div>",
])("reports malformed credit markup instead of silently returning no credits (%#)", async (markup) => {
	document.querySelector("main")!.innerHTML = block("101", markup);
	await expect(readTidalCreditsPage("123", ["101"])).resolves.toHaveProperty(
		"error",
		expect.stringContaining("Could not parse Tidal"),
	);
});

test.each([
	block("101") + block("101"),
	block("101") + block("102"),
])("rejects duplicate or mismatched track coverage (%#)", async (markup) => {
	document.querySelector("main")!.innerHTML = markup;
	await expect(readTidalCreditsPage("123", ["101"])).resolves.toHaveProperty(
		"error",
		expect.any(String),
	);
});

test("reports a partial page or changed selectors after a bounded wait", async () => {
	vi.useFakeTimers();
	document.querySelector("main")!.innerHTML = block("101");
	const read = readTidalCreditsPage("123", ["101", "102"]);
	await vi.advanceTimersByTimeAsync(25_000);
	await expect(read).resolves.toHaveProperty(
		"error",
		expect.stringContaining("did not finish loading"),
	);
	expect(vi.getTimerCount()).toBe(0);
});

test("rejects an unexpected page before reading its DOM", async () => {
	vi.stubGlobal("location", new URL("https://tidal.com/login"));
	await expect(readTidalCreditsPage("123", ["101"])).resolves.toHaveProperty(
		"error",
		expect.stringContaining("unexpected URL"),
	);
});

test.each([
	undefined,
	null,
	{},
	{ tracks: null },
	{ tracks: [{ id: "bad", credits: [] }] },
	{ tracks: [{ id: "101", credits: [{ name: "", role: "Composer" }] }] },
	{ tracks: [{ id: "101", credits: [{ name: "Person", role: "" }] }] },
	{ tracks: [{ id: "101" }] },
	{ error: "" },
])("rejects malformed serialized reader responses (%#)", (value) => {
	expect(isTidalCreditsResult(value)).toBe(false);
});

test("validates genuine empty credits and explicit reader failures", () => {
	expect(isTidalCreditsResult({ tracks: [{ id: "101", credits: [] }] })).toBe(
		true,
	);
	expect(isTidalCreditsResult({ error: "Page unavailable" })).toBe(true);
});
