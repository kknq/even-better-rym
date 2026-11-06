// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, expect, test, vi } from "vitest";

import {
	readFiledUnderEntries,
	syncFiledUnderEntries,
	watchFiledUnderChanges,
} from "../utils/filed-under";
import type { ReleaseArtistLabels } from "../utils/release-artist-links";
import injectPicker from "./release-artist-picker";

vi.mock("webextension-polyfill", () => ({ default: {} }));

vi.mock("../utils/filed-under", async (importOriginal) => ({
	...(await importOriginal<typeof import("../utils/filed-under")>()),
	readFiledUnderEntries: vi.fn(() => [{ id: "1", name: "Manual" }]),
	syncFiledUnderEntries: vi.fn().mockResolvedValue(undefined),
	switchAwayFromSameAsParent: vi.fn(),
	watchFiledUnderChanges: vi.fn(() => () => undefined),
}));

const ORIGINAL_URL = window.location.href;

async function injectReleaseArtistPicker() {
	document.body.insertAdjacentHTML(
		"beforeend",
		`<input type="radio" id="credited_name_default" name="credited_name" value="default" checked>
		<input type="radio" id="credited_name_specified" name="credited_name" value="specified">
		<input id="credited_firstname" disabled>
		<input id="credited_lastname" disabled>`,
	);
	await injectPicker();
}

function creditedName() {
	return {
		useDefault: document.querySelector<HTMLInputElement>(
			"#credited_name_default",
		)?.checked,
		specified: document.querySelector<HTMLInputElement>(
			"#credited_name_specified",
		)?.checked,
		first: document.querySelector<HTMLInputElement>("#credited_firstname")
			?.value,
		last: document.querySelector<HTMLInputElement>("#credited_lastname")?.value,
	};
}

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
])("keeps section 1.4 at its default for 劣 [Lie] (issue=%s)", async (issue) => {
	window.history.replaceState(
		null,
		"",
		issue ? "/releases/edit" : "/releases/ac?artist_id=2068672",
	);
	document.body.innerHTML = `
		${issue ? '<input id="filed_under_same_as_parent_no">' : ""}
		<div id="section_filed_under">
			<ul id="filed_under_performerx">
				<li class="sortable_filed_under_performer" id="filed_under_performer_1">
					<input id="filed_under_performer_artist_1" value="[Artist2068672]">
					<div class="filed_under_artist_preview">
						<span class="rendered_text"><a class="artist">劣 <span class="subtext">[Lie]</span></a></span>
					</div>
				</li>
			</ul>
		</div>`;
	const actual = await vi.importActual<typeof import("../utils/filed-under")>(
		"../utils/filed-under",
	);
	vi.mocked(readFiledUnderEntries).mockImplementationOnce(
		actual.readFiledUnderEntries,
	);
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
				new CustomEvent("releaseArtistsEvent", { detail: ["劣"] }),
			);
		});
		await vi.waitFor(() =>
			expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
				[{ id: "2068672", name: "劣 [Lie]" }],
				new Set(["2068672"]),
			),
		);
		expect(creditedName()).toEqual({
			useDefault: true,
			specified: false,
			first: "",
			last: "",
		});
		expect(published.mock.calls.at(-1)?.[0].detail.labels).toEqual(
			new Map([["劣", "[Artist2068672]"]]),
		);
		expect(document.querySelector(".ebr-automatic-alias-warning")).toBeNull();
	} finally {
		document.removeEventListener("releaseArtistLabelsEvent", published);
	}
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
		expect(creditedName()).toEqual({
			useDefault: false,
			specified: true,
			first: "",
			last: "zavet",
		});
		expect(
			document.querySelector(".ebr-automatic-alias-warning")?.textContent,
		).toContain('"zavet"');
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
		expect(creditedName().useDefault).toBe(true);
		expect(creditedName().last).toBe("");
		expect(document.querySelector(".ebr-automatic-alias-warning")).toBeNull();
		expect(restore?.disabled).toBe(false);
		await act(() => restore?.click());
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[entry],
			new Set(["1479561"]),
		);
		expect(creditedName().last).toBe("zavet");
		expect(
			document.querySelector(".ebr-automatic-alias-warning")?.textContent,
		).toContain("before submitting");
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
		expect(creditedName()).toEqual({
			useDefault: false,
			specified: true,
			first: "",
			last: "zavet",
		});
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
		expect(creditedName().useDefault).toBe(true);
		expect(creditedName().last).toBe("");
	} finally {
		document.removeEventListener("releaseArtistLabelsEvent", published);
	}
});

test("uses the imported alias as the native artist name after a differently named search result is picked", async () => {
	window.history.replaceState(null, "", "/releases/ac");
	document.body.innerHTML = `
		<div id="section_filed_under">
			<div class="gosearch"><input id="filed_under_searchterm">
				<input type="button" value="Search"></div>
		</div>
	`;
	await act(async () => injectReleaseArtistPicker());
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["zavet"] }),
		);
	});
	await act(() => {
		document
			.querySelector<HTMLInputElement>('input[value="Find on RYM"]')
			?.click();
	});
	await act(() => {
		const changed = vi.mocked(watchFiledUnderChanges).mock.calls.at(-1)?.[0];
		if (!changed) throw new Error("Missing filed-under watcher");
		changed({
			added: [{ id: "1479561", name: "Kai Angel" }],
			presentIds: new Set(["1479561"]),
		});
	});
	await vi.waitFor(() =>
		expect(syncFiledUnderEntries).toHaveBeenLastCalledWith(
			[{ id: "1479561", name: "Kai Angel" }],
			new Set(["1479561"]),
		),
	);
	expect(creditedName()).toEqual({
		useDefault: false,
		specified: true,
		first: "",
		last: "zavet",
	});
});

test.each([
	{ selected: "Molchat Doma", token: "[Artist1238361]" },
	{ selected: "Молчат Дома", token: "[Artist1238361,Molchat Doma]" },
])("handles native filed-under selection without the shortcut popup ($selected)", async ({
	selected,
	token,
}) => {
	const actual = await vi.importActual<typeof import("../utils/filed-under")>(
		"../utils/filed-under",
	);
	vi.mocked(watchFiledUnderChanges).mockImplementationOnce(
		actual.watchFiledUnderChanges,
	);
	window.history.replaceState(null, "", "/releases/ac");
	document.body.innerHTML = `
		<div id="section_filed_under">
			<div class="gosearch"><input id="filed_under_searchterm">
				<input type="button" value="Search"></div>
			<ul id="filed_under_performerx"></ul>
		</div>
	`;
	const published = vi.fn(
		(event: CustomEvent<ReleaseArtistLabels>) => event.detail,
	);
	document.addEventListener("releaseArtistLabelsEvent", published);
	try {
		await act(async () => injectReleaseArtistPicker());
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistsEvent", {
					detail: ["Molchat Doma"],
				}),
			);
		});
		await act(() => {
			document
				.querySelector<HTMLInputElement>('input[value="Find on RYM"]')
				?.click();
		});
		await act(() => {
			document.querySelector("#filed_under_performerx")?.insertAdjacentHTML(
				"beforeend",
				`<li id="filed_under_performer_1" class="sortable_filed_under_performer">
					<input id="filed_under_performer_artist_1" value="[Artist1238361]">
					<span class="filed_under_artist_preview">${selected}</span>
				</li>`,
			);
		});
		await vi.waitFor(() =>
			expect(published.mock.calls.at(-1)?.[0].detail.labels).toEqual(
				new Map([["Molchat Doma", token]]),
			),
		);
		expect(published.mock.calls.at(-1)?.[0].detail.artistNames).toEqual(
			new Map([["Molchat Doma", selected]]),
		);
		expect(document.querySelector("#shortcutsearchframe")).toBeNull();
		await vi.waitFor(() =>
			expect(creditedName().last).toBe(
				selected === "Molchat Doma" ? "" : "Molchat Doma",
			),
		);
	} finally {
		document.removeEventListener("releaseArtistLabelsEvent", published);
	}
});

test("restores an untouched automatic alias when the next import uses the canonical name", async () => {
	window.history.replaceState(null, "", "/releases/ac?artist_id=1479561");
	vi.mocked(readFiledUnderEntries).mockReturnValue([
		{ id: "1479561", name: "Kai Angel" },
	]);
	document.body.innerHTML = '<div id="section_filed_under"></div>';
	await act(async () => injectReleaseArtistPicker());
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["zavet"] }),
		);
	});
	expect(creditedName().last).toBe("zavet");
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["Kai Angel"] }),
		);
	});
	expect(creditedName()).toEqual({
		useDefault: true,
		specified: false,
		first: "",
		last: "",
	});
});

test("preserves a manually edited artist name when the next import starts", async () => {
	window.history.replaceState(null, "", "/releases/ac?artist_id=1479561");
	vi.mocked(readFiledUnderEntries).mockReturnValue([
		{ id: "1479561", name: "Kai Angel" },
	]);
	document.body.innerHTML = '<div id="section_filed_under"></div>';
	await act(async () => injectReleaseArtistPicker());
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["zavet"] }),
		);
	});
	const last = document.querySelector<HTMLInputElement>("#credited_lastname");
	if (!last) throw new Error("Missing artist Last name field");
	last.value = "Manually credited name";
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["Kai Angel"] }),
		);
	});
	expect(creditedName()).toEqual({
		useDefault: false,
		specified: true,
		first: "",
		last: "Manually credited name",
	});
});

test("does not set a stale alias after its filed-under edit finishes during another import", async () => {
	window.history.replaceState(null, "", "/releases/ac?artist_id=1479561");
	vi.mocked(readFiledUnderEntries).mockReturnValue([
		{ id: "1479561", name: "Kai Angel" },
	]);
	let finish: (() => void) | undefined;
	vi.mocked(syncFiledUnderEntries).mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	document.body.innerHTML = '<div id="section_filed_under"></div>';
	await act(async () => injectReleaseArtistPicker());
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["zavet"] }),
		);
	});
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("releaseArtistsEvent", { detail: ["Kai Angel"] }),
		);
	});
	await act(() => finish?.());
	expect(creditedName()).toEqual({
		useDefault: true,
		specified: false,
		first: "",
		last: "",
	});
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
