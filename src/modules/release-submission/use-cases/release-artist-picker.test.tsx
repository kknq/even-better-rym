// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, expect, test, vi } from "vitest";

import {
	readFiledUnderEntries,
	syncFiledUnderEntries,
} from "../utils/filed-under";
import type { ReleaseArtistLabels } from "../utils/release-artist-links";
import injectReleaseArtistPicker from "./release-artist-picker";

vi.mock("webextension-polyfill", () => ({ default: {} }));

vi.mock("../utils/filed-under", async (importOriginal) => ({
	...(await importOriginal<typeof import("../utils/filed-under")>()),
	readFiledUnderEntries: vi.fn(() => [{ id: "1", name: "Manual" }]),
	syncFiledUnderEntries: vi.fn().mockResolvedValue(undefined),
	switchAwayFromSameAsParent: vi.fn(),
	watchFiledUnderChanges: vi.fn(() => () => undefined),
}));

const ORIGINAL_URL = window.location.href;

afterEach(() => {
	const container = document.querySelector(
		"#section_filed_under",
	)?.previousElementSibling;
	if (container) render(null, container);
	document.body.replaceChildren();
	window.history.replaceState(null, "", ORIGINAL_URL);
	vi.clearAllMocks();
	vi.mocked(readFiledUnderEntries).mockReturnValue([
		{ id: "1", name: "Manual" },
	]);
});

test.each([
	false,
	true,
])("links a single imported alias to the artist prefilled by the page (issue=%s)", async (issue) => {
	window.history.replaceState(null, "", "/releases/ac?artist_id=1479561");
	const entry = { id: "1479561", name: "Kai Angel" };
	vi.mocked(readFiledUnderEntries).mockReturnValue([entry]);
	document.body.innerHTML = `${issue ? '<input id="filed_under_same_as_parent_no">' : ""}
		<div id="section_filed_under"></div>`;
	const published = vi.fn(
		(event: CustomEvent<ReleaseArtistLabels>) => event.detail,
	);
	document.addEventListener("releaseArtistLabelsEvent", published);
	try {
		await act(async () => {
			await injectReleaseArtistPicker();
		});
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistsEvent", { detail: ["zavet"] }),
			);
		});
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[entry],
			new Set(["1479561"]),
		);
		expect(published.mock.calls.at(-1)?.[0].detail.labels).toEqual(
			new Map([["zavet", "[Artist1479561,zavet]"]]),
		);
		expect(document.body.textContent).toContain("filed under Kai Angel");
		expect(document.body.textContent).not.toContain("(from parent)");
		expect(
			document.querySelector('input[value="Replace artist link"]'),
		).not.toBeNull();
		expect(document.querySelector("select")).toBeNull();
		const restore = document.querySelector<HTMLInputElement>(
			'input[value="Use page artist"]',
		);
		expect(restore?.disabled).toBe(true);
		await act(() =>
			document
				.querySelector<HTMLInputElement>('input[value="Don\'t file under"]')
				?.click(),
		);
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[],
			new Set(["1479561"]),
		);
		expect(restore?.disabled).toBe(false);
		await act(() => restore?.click());
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[entry],
			new Set(["1479561"]),
		);
	} finally {
		document.removeEventListener("releaseArtistLabelsEvent", published);
	}
});

test.each([
	{
		path: "/releases/ac?artist_id=1479561",
		names: ["zavet", "Other"],
		id: "1479561",
	},
	{ path: "/releases/ac?artist_id=1479561", names: ["zavet"], id: "99" },
	{ path: "/releases/ac?artist_id=invalid", names: ["zavet"], id: "1479561" },
	{ path: "/releases/ac", names: ["zavet"], id: "1479561" },
	{ path: "/releases/edit?artist_id=1479561", names: ["zavet"], id: "1479561" },
])("does not guess a page-artist association for $path / $names / $id", async ({
	path,
	names,
	id,
}) => {
	window.history.replaceState(null, "", path);
	vi.mocked(readFiledUnderEntries).mockReturnValue([{ id, name: "Kai Angel" }]);
	document.body.innerHTML = '<div id="section_filed_under"></div>';
	await act(async () => {
		await injectReleaseArtistPicker();
	});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: names }),
		);
	});
	expect(syncFiledUnderEntries).toHaveBeenLastCalledWith([], new Set());
	expect(document.querySelector('input[value="Use page artist"]')).toBeNull();
	expect(
		document.querySelector('input[value="Replace artist link"]'),
	).toBeNull();
});

test.each([
	false,
	true,
])("only manages pre-existing entries on an issue (issue=%s)", async (issue) => {
	document.body.innerHTML = `${issue ? '<input id="filed_under_same_as_parent_no">' : ""}
		<div id="section_filed_under"></div>`;
	await act(async () => {
		await injectReleaseArtistPicker();
	});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["Imported"] }),
		);
	});
	expect(syncFiledUnderEntries).toHaveBeenCalledWith(
		[],
		new Set(issue ? ["1"] : []),
	);
	expect(readFiledUnderEntries).toHaveBeenCalledTimes(issue ? 1 : 0);
});

test("matches parent links automatically but only offers other parent artists as explicit aliases", async () => {
	vi.mocked(readFiledUnderEntries).mockReturnValueOnce([
		{ id: "1639184", name: "1000 Eyes" },
	]);
	document.body.innerHTML = `
		<input id="filed_under_same_as_parent_no">
		<div id="section_filed_under"></div>
	`;
	await act(async () => {
		await injectReleaseArtistPicker();
	});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", {
				detail: ["1000 Eyes", "Tom Schley"],
			}),
		);
	});

	const rows = document.querySelectorAll("tr");
	const parentButton = rows[0]?.querySelector<HTMLInputElement>(
		'input[value="Use parent link"]',
	);
	expect(parentButton).not.toBeNull();
	expect(parentButton?.disabled).toBe(true);
	expect(
		rows[0]?.querySelector('input[value="Replace artist link"]'),
	).not.toBeNull();
	expect(rows[1]?.textContent).toContain("Tom Schley");
	expect(rows[1]?.querySelector('input[value="Find on RYM"]')).not.toBeNull();
	expect(rows[1]?.querySelector('input[value="Use parent link"]')).toBeNull();
	expect(rows[0]?.querySelector("select")).toBeNull();
	const aliasSelect = rows[1]?.querySelector("select");
	expect(aliasSelect?.value).toBe("");
	expect(aliasSelect?.options[0]?.textContent).toBe(
		"Use parent artist (alias)…",
	);
	expect(aliasSelect?.options[1]?.textContent).toBe("1000 Eyes");

	await act(() => {
		rows[0]
			?.querySelector<HTMLInputElement>('input[value="Don\'t file under"]')
			?.click();
	});
	expect(parentButton?.disabled).toBe(false);
	await act(() => {
		parentButton?.click();
	});
	expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
		[{ id: "1639184", name: "1000 Eyes" }],
		new Set(["1639184"]),
	);
	expect(parentButton?.disabled).toBe(true);
});

test("maps the imported alias zavet to the existing Kai Angel parent link without another search", async () => {
	vi.mocked(readFiledUnderEntries).mockReturnValueOnce([
		{ id: "1479561", name: "Kai Angel" },
	]);
	document.body.innerHTML = `
		<input id="filed_under_same_as_parent_no">
		<div id="section_filed_under">
			<div class="gosearch">
				<input id="filed_under_searchterm">
				<input type="button" value="Search">
			</div>
		</div>
	`;
	const published = vi.fn(
		(event: CustomEvent<ReleaseArtistLabels>) => event.detail,
	);
	document.addEventListener("releaseArtistLabelsEvent", published);
	try {
		await act(async () => {
			await injectReleaseArtistPicker();
		});
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistsEvent", { detail: ["zavet"] }),
			);
		});
		const select = document.querySelector("select");
		expect(select?.value).toBe("");
		expect(select?.options[1]?.textContent).toBe("Kai Angel");
		expect(document.querySelector('input[value="Use parent link"]')).toBeNull();
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[],
			new Set(["1479561"]),
		);
		await act(() => {
			document
				.querySelector<HTMLInputElement>('input[value="Find on RYM"]')
				?.click();
		});
		const search = document.querySelector<HTMLInputElement>(
			"#filed_under_searchterm",
		);
		expect(search?.value).toBe("zavet");
		await act(() => {
			if (!select) throw new Error("Missing parent alias selector");
			select.value = "1479561";
			select.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[{ id: "1479561", name: "Kai Angel" }],
			new Set(["1479561"]),
		);
		expect(select?.value).toBe("1479561");
		expect(search?.value).toBe("");
		expect(
			document.querySelector('input[value="Cancel selection"]'),
		).toBeNull();
		expect(document.body.textContent).toContain(
			"filed under Kai Angel (from parent)",
		);
		expect(published.mock.calls.at(-1)?.[0].detail.labels).toEqual(
			new Map([["zavet", "[Artist1479561,zavet]"]]),
		);
		await act(() => {
			if (!select) throw new Error("Missing parent alias selector");
			select.value = "";
			select.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[],
			new Set(["1479561"]),
		);
		expect(published.mock.calls.at(-1)?.[0].detail.labels).toEqual(new Map());
	} finally {
		document.removeEventListener("releaseArtistLabelsEvent", published);
	}
});

test("keeps track-title controls out of the Filed under section", async () => {
	vi.mocked(readFiledUnderEntries).mockReturnValueOnce([
		{ id: "1639184", name: "1000 Eyes" },
	]);
	document.body.innerHTML = `
		<input id="filed_under_same_as_parent_no">
		<div id="section_filed_under"></div>
	`;
	await act(async () => {
		await injectReleaseArtistPicker();
	});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", {
				detail: ["1000 Eyes", "Tom Schley"],
			}),
		);
	});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: {
					data: { tracks: [{ position: "1", title: "First" }] },
					options: { fillFields: { tracks: true } },
				},
			}),
		);
	});
	expect(
		document.querySelector('input[value="Add to track titles"]'),
	).toBeNull();
});

test("cancelling clears the search field without changing the chosen artist", async () => {
	vi.mocked(readFiledUnderEntries).mockReturnValueOnce([
		{ id: "1639184", name: "1000 Eyes" },
	]);
	document.body.innerHTML = `
		<input id="filed_under_same_as_parent_no">
		<div id="section_filed_under">
			<div class="gosearch">
				<input id="filed_under_searchterm">
				<input type="button" value="Search">
			</div>
		</div>
	`;
	await act(async () => {
		await injectReleaseArtistPicker();
	});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["1000 Eyes"] }),
		);
	});
	const searchInput = document.querySelector<HTMLInputElement>(
		"#filed_under_searchterm",
	);
	const onSearch = vi.fn();
	document
		.querySelector('input[value="Search"]')
		?.addEventListener("click", onSearch);
	await act(() => {
		document
			.querySelector<HTMLInputElement>('input[value="Replace artist link"]')
			?.click();
	});
	expect(searchInput?.value).toBe("1000 Eyes");
	expect(onSearch).toHaveBeenCalledOnce();
	vi.mocked(syncFiledUnderEntries).mockClear();
	await act(() => {
		document
			.querySelector<HTMLInputElement>('input[value="Cancel selection"]')
			?.click();
	});
	expect(searchInput?.value).toBe("");
	expect(onSearch).toHaveBeenCalledOnce();
	expect(syncFiledUnderEntries).not.toHaveBeenCalled();
	expect(document.body.textContent).toContain(
		"filed under 1000 Eyes (from parent)",
	);
	expect(document.querySelector('input[value="Cancel selection"]')).toBeNull();
});
