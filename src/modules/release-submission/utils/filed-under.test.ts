// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";

import { runScript } from "~/shared/utils/dom";
import {
	createCreditedNameSuggestion,
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
		<div class="submit_field_content">
			<div class="submit_field_description">1.4 Artist name</div>
			<table><tbody>
				<tr><td><input type="radio" id="credited_name_default" name="credited_name" checked>
					<span id="credited_artist_default">Kai Angel</span></td></tr>
				<tr><td>
					<input type="radio" id="credited_name_specified" name="credited_name">
					<input id="credited_firstname" disabled>
					<input id="credited_lastname" disabled>
				</td></tr>
			</tbody></table>
		</div>
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

const suggestion = () =>
	document.querySelector<HTMLElement>(".ebr-credited-name-suggestion");

const acceptSuggestion = () =>
	suggestion()?.querySelector<HTMLInputElement>("input[type=button]")?.click();

test("suggests crediting under the imported name above the 1.4 radio buttons without changing them", () => {
	const fields = creditedNameFields();
	const sync = createCreditedNameSuggestion();
	sync("zavet");
	const box = suggestion();
	expect(box?.textContent).toContain('"zavet"');
	expect(box?.textContent).toContain('default "Kai Angel"');
	expect(box?.querySelector("input")?.title).toContain("Last Name");
	expect(box?.firstElementChild?.getAttribute("style")).toContain("flex");
	expect(box?.style.color).toBe("");
	expect(box?.querySelector("span")?.style.color).toBe("rgb(138, 28, 28)");
	expect((box?.firstElementChild as HTMLElement | null)?.style.background).toBe(
		"rgb(255, 240, 240)",
	);
	expect(box?.parentElement?.className).toBe("submit_field_content");
	expect(box?.nextElementSibling?.tagName).toBe("TABLE");
	expect(fields.defaultRadio.checked).toBe(true);
	expect(fields.last.value).toBe("");
	expect(fields.last.disabled).toBe(true);
	sync("Another Alias");
	expect(
		document.querySelectorAll(".ebr-credited-name-suggestion"),
	).toHaveLength(1);
	expect(suggestion()?.textContent).toContain('"Another Alias"');
	sync(undefined);
	expect(suggestion()).toBeNull();
});

test("renders the suggested name without interpreting HTML", () => {
	creditedNameFields();
	const alias = '<img src=x onerror="alert(1)">';
	createCreditedNameSuggestion()(alias);
	expect(suggestion()?.textContent).toContain(alias);
	expect(suggestion()?.querySelector("img")).toBeNull();
});

test("accepting the suggestion selects Use: and puts the whole name in Last Name", () => {
	const fields = creditedNameFields();
	fields.first.value = "Old first";
	fields.last.value = "Old last";
	const changed = vi.fn();
	document.body.addEventListener("change", changed);
	try {
		createCreditedNameSuggestion()("zavet");
		acceptSuggestion();
		expect(fields.defaultRadio.checked).toBe(false);
		expect(fields.specifiedRadio.checked).toBe(true);
		expect(fields.first.value).toBe("");
		expect(fields.last.value).toBe("zavet");
		expect(fields.first.disabled).toBe(false);
		expect(fields.last.disabled).toBe(false);
		expect(suggestion()).toBeNull();
		expect(
			changed.mock.calls.map(([event]) => (event as Event).target),
		).toContain(fields.last);
	} finally {
		document.body.removeEventListener("change", changed);
	}
});

test("restores the original fields when an accepted name is no longer imported", () => {
	const fields = creditedNameFields();
	fields.first.value = "Saved first";
	fields.last.value = "Saved last";
	const sync = createCreditedNameSuggestion();
	sync("zavet");
	acceptSuggestion();
	sync("zavet");
	expect(suggestion()).toBeNull();
	sync(undefined);
	expect(fields.defaultRadio.checked).toBe(true);
	expect(fields.first.value).toBe("Saved first");
	expect(fields.last.value).toBe("Saved last");
	expect(fields.last.disabled).toBe(true);
	sync("Another Alias");
	expect(fields.last.value).toBe("Saved last");
	expect(suggestion()?.textContent).toContain('"Another Alias"');
});

test("keeps an accepted name the user edited afterwards", () => {
	const fields = creditedNameFields();
	const sync = createCreditedNameSuggestion();
	sync("zavet");
	acceptSuggestion();
	fields.last.value = "Manual edit";
	sync(undefined);
	expect(fields.specifiedRadio.checked).toBe(true);
	expect(fields.last.value).toBe("Manual edit");
});

test("does not suggest anything without a differing name or when it is already used", () => {
	const fields = creditedNameFields();
	createCreditedNameSuggestion()(undefined);
	expect(suggestion()).toBeNull();
	fields.specifiedRadio.click();
	fields.last.value = "zavet";
	createCreditedNameSuggestion()("zavet");
	expect(suggestion()).toBeNull();
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
