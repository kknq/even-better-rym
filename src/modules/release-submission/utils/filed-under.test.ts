// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";

import { runScript } from "~/shared/utils/dom";
import {
	createCreditedNameSync,
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

function creditedNameFields() {
	document.body.innerHTML = `
		<input type="radio" id="credited_name_default" name="credited_name" checked>
		<input type="radio" id="credited_name_specified" name="credited_name">
		<input id="credited_firstname" disabled>
		<input id="credited_lastname" disabled>
	`;
	const input = (id: string) => {
		const field = document.querySelector<HTMLInputElement>(`#${id}`);
		if (!field) throw new Error(`Missing ${id}`);
		return field;
	};
	return {
		defaultRadio: input("credited_name_default"),
		specifiedRadio: input("credited_name_specified"),
		first: input("credited_firstname"),
		last: input("credited_lastname"),
	};
}

test("selects the custom artist name and puts the whole alias in Last name", () => {
	const fields = creditedNameFields();
	fields.first.value = "Old first";
	fields.last.value = "Old last";
	const changed = vi.fn();
	document.body.addEventListener("change", changed);
	try {
		createCreditedNameSync()("zavet");
		expect(fields.defaultRadio.checked).toBe(false);
		expect(fields.specifiedRadio.checked).toBe(true);
		expect(fields.first.value).toBe("");
		expect(fields.last.value).toBe("zavet");
		expect(fields.first.disabled).toBe(false);
		expect(fields.last.disabled).toBe(false);
		expect(
			changed.mock.calls.map(([event]) => (event as Event).target),
		).toContain(fields.last);
	} finally {
		document.body.removeEventListener("change", changed);
	}
});

test("restores the original default fields when an automatic alias is removed", () => {
	const fields = creditedNameFields();
	fields.first.value = "Saved first";
	fields.last.value = "Saved last";
	const sync = createCreditedNameSync();
	sync("zavet");
	sync(undefined);
	expect(fields.defaultRadio.checked).toBe(true);
	expect(fields.specifiedRadio.checked).toBe(false);
	expect(fields.first.value).toBe("Saved first");
	expect(fields.last.value).toBe("Saved last");
	expect(fields.first.disabled).toBe(true);
	expect(fields.last.disabled).toBe(true);
	sync("Another Alias");
	expect(fields.last.value).toBe("Another Alias");
});

test("preserves an existing manually specified artist name", () => {
	const fields = creditedNameFields();
	fields.specifiedRadio.click();
	fields.first.value = "Manual first";
	fields.last.value = "Manual last";
	createCreditedNameSync()("zavet");
	expect(fields.specifiedRadio.checked).toBe(true);
	expect(fields.first.value).toBe("Manual first");
	expect(fields.last.value).toBe("Manual last");
});

test.each([
	"first",
	"last",
] as const)("stops controlling the artist name after the user edits %s", (field) => {
	const fields = creditedNameFields();
	const sync = createCreditedNameSync();
	sync("zavet");
	fields[field].value = "Manual edit";
	sync(undefined);
	sync("Another Alias");
	expect(fields.specifiedRadio.checked).toBe(true);
	expect(fields[field].value).toBe("Manual edit");
});

test("preserves the user's explicit switch back to Use default", () => {
	const fields = creditedNameFields();
	const sync = createCreditedNameSync();
	sync("zavet");
	fields.defaultRadio.click();
	sync("Another Alias");
	sync(undefined);
	expect(fields.defaultRadio.checked).toBe(true);
	expect(fields.specifiedRadio.checked).toBe(false);
});

test("does not touch default artist-name fields when there is no alias", () => {
	const fields = creditedNameFields();
	createCreditedNameSync()(undefined);
	expect(fields.defaultRadio.checked).toBe(true);
	expect(fields.last.value).toBe("");
	expect(fields.last.disabled).toBe(true);
});

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
