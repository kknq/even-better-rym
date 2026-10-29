// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";

import { runScript } from "~/shared/utils/dom";
import {
	removeRepeatedFiledUnderEntries,
	syncFiledUnderEntries,
	watchFiledUnderChanges,
} from "./filed-under";

vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("~/shared/utils/dom", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/utils/dom")>()),
	runScript: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
	document.body.replaceChildren();
	vi.clearAllMocks();
});

function row(number: string, id: string, name = "Artist") {
	return `<li id="filed_under_performer_${number}" class="sortable_filed_under_performer">
		<input id="filed_under_performer_artist_${number}" value="[Artist${id}]">
		<span class="filed_under_artist_preview">${name}</span></li>`;
}

test("preserves unmanaged artists while removing and reordering managed ones", async () => {
	document.body.innerHTML = `<ul id="filed_under_performerx">
		${row("1", "1")}${row("2", "2")}${row("3", "3")}</ul>`;
	vi.mocked(runScript).mockImplementation((script) => {
		const number = /^deleteFiledUnder\((\d+)/.exec(script)?.[1];
		if (number)
			document.getElementById(`filed_under_performer_${number}`)?.remove();
		return Promise.resolve();
	});
	await syncFiledUnderEntries(
		[{ id: "3", name: "Artist" }],
		new Set(["1", "3"]),
	);
	expect(
		[...document.querySelectorAll("li")].map((element) => element.id),
	).toEqual(["filed_under_performer_3", "filed_under_performer_2"]);
	expect(runScript).toHaveBeenCalledWith('deleteFiledUnder(1, "performer");');
});

test("removes later copies rather than deleting the chosen first entry", async () => {
	document.body.innerHTML = `<ul>${row("1", "12")}${row("2", "12")}</ul>`;
	await removeRepeatedFiledUnderEntries();
	expect(runScript).toHaveBeenCalledExactlyOnceWith(
		'deleteFiledUnder(2, "performer");',
	);
});

test("reports added rows once and stops observing on cleanup", async () => {
	document.body.innerHTML = `<ul id="filed_under_performerx">${row("1", "1")}</ul>`;
	const changed = vi.fn();
	const stop = watchFiledUnderChanges(changed);
	document.querySelector("ul")?.insertAdjacentHTML("beforeend", row("2", "2"));
	await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
	expect(changed).toHaveBeenCalledWith({
		added: [{ id: "2", name: "Artist" }],
		presentIds: new Set(["1", "2"]),
	});
	stop();
	document.querySelector("ul")?.insertAdjacentHTML("beforeend", row("3", "3"));
	await Promise.resolve();
	expect(changed).toHaveBeenCalledOnce();
});
