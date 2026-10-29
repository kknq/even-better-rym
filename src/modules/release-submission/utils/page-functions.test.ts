// @vitest-environment jsdom

import { runInNewContext } from "node:vm";
import { afterEach, expect, test, vi } from "vitest";
import { runScript } from "~/shared/utils/dom";
import {
	addArtistCredit,
	attachCreditRoleSuggestions,
	updateCreditDetails,
} from "./page-functions";

vi.mock("~/shared/utils/dom", () => ({ runScript: vi.fn() }));

afterEach(() => {
	vi.clearAllMocks();
	document.body.replaceChildren();
});

test("reuses native role suggestions and bridges selections into input/change events only for extension fields", async () => {
	document.body.innerHTML = `
		<input id="suggested" data-ebr-credit-role>
		<input id="native">
	`;
	const input = document.querySelector<HTMLInputElement>("#suggested");
	const native = document.querySelector<HTMLInputElement>("#native");
	if (!input || !native) throw new Error("Missing role inputs");
	const onInput = vi.fn();
	const onChange = vi.fn();
	input.addEventListener("input", onInput);
	input.addEventListener("change", onChange);
	const nativeChanged = vi.fn();
	native.addEventListener("change", nativeChanged);
	const choose = vi.fn((value: string) => {
		if (!page.roleinputEl) throw new Error("No active role input");
		page.roleinputEl.value = value;
		return "selected";
	});
	const page = {
		roleinputEl: input,
		rolechooseSuggestion: choose,
		roleattachSuggest: vi.fn((id: string) => {
			const field = document.getElementById(id);
			if (!(field instanceof HTMLInputElement))
				throw new Error("Missing role input");
			page.roleinputEl = field;
		}),
	};
	vi.mocked(runScript).mockImplementation((script) =>
		Promise.resolve().then(() => {
			runInNewContext(script, { window: page, Event });
		}),
	);
	await attachCreditRoleSuggestions(input.id);
	await attachCreditRoleSuggestions(input.id);
	expect(page.roleattachSuggest).toHaveBeenLastCalledWith(input.id);
	expect(page.rolechooseSuggestion("producer, mixing")).toBe("selected");
	expect(input.value).toBe("producer, mixing");
	expect(onInput).toHaveBeenCalledOnce();
	expect(onChange).toHaveBeenCalledOnce();
	expect(choose).toHaveBeenCalledOnce();
	await attachCreditRoleSuggestions(native.id);
	page.rolechooseSuggestion("vocals");
	expect(native.value).toBe("vocals");
	expect(nativeChanged).not.toHaveBeenCalled();
	expect(onChange).toHaveBeenCalledOnce();
});

test.each([
	{ id: "1479561", creditedName: "zavet", expected: "[Artist1479561,zavet]" },
	{ id: "1479561", creditedName: undefined, expected: "[Artist1479561]" },
	{ id: undefined, creditedName: undefined, expected: "zavet" },
])("writes the exact credited artist token ($expected)", async ({
	id,
	creditedName,
	expected,
}) => {
	const preview = vi.fn();
	vi.mocked(runScript).mockImplementation((script) =>
		Promise.resolve().then(() => {
			runInNewContext(script, {
				document,
				credits_num: 1,
				addCredit: (_type: string, artistId: string) => {
					document.body.innerHTML = `
						<input id="credits_artist_1">
						<input id="credits_roles_1">
						<input id="credits_tracks_1">
					`;
					const field =
						document.querySelector<HTMLInputElement>("#credits_artist_1");
					if (field) field.value = `[Artist${artistId}]`;
				},
				updateArtistPreview: preview,
			});
		}),
	);
	await addArtistCredit({
		id,
		name: "zavet",
		creditedName,
		role: "vocals, producer",
		tracks: "1, 3",
	});
	expect(
		document.querySelector<HTMLInputElement>("#credits_artist_1")?.value,
	).toBe(expected);
	expect(
		document.querySelector<HTMLInputElement>("#credits_roles_1")?.value,
	).toBe("vocals, producer");
	expect(
		document.querySelector<HTMLInputElement>("#credits_tracks_1")?.value,
	).toBe("1, 3");
	if (creditedName === undefined) expect(preview).not.toHaveBeenCalled();
	else expect(preview).toHaveBeenCalledExactlyOnceWith(1, "credits");
});

test("reports unavailable native role suggestions", async () => {
	vi.mocked(runScript).mockImplementation((script) =>
		Promise.resolve().then(() => {
			runInNewContext(script, { window: {} });
		}),
	);
	await expect(attachCreditRoleSuggestions("role")).rejects.toThrow(
		"RYM credit role suggestions are unavailable",
	);
});

test("updates existing credit fields without recreating a row or changing native autocomplete focus", async () => {
	document.body.innerHTML = `
		<input id="credits_roles_1" value="producer">
		<input id="credits_tracks_1" value="1">
		<input id="suggested" data-ebr-credit-role>
	`;
	const role = document.querySelector<HTMLInputElement>("#credits_roles_1");
	const tracks = document.querySelector<HTMLInputElement>("#credits_tracks_1");
	const focused = document.getElementById("suggested");
	const page = { roleinputEl: focused };
	const changed = vi.fn();
	role?.addEventListener("change", changed);
	tracks?.addEventListener("change", changed);
	vi.mocked(runScript).mockImplementation((script) =>
		Promise.resolve().then(() => {
			runInNewContext(script, { document, window: page, Event });
		}),
	);
	await updateCreditDetails("1", 'mixing, vocals [as "Example"]', "");
	expect(role?.value).toBe('mixing, vocals [as "Example"]');
	expect(tracks?.value).toBe("");
	expect(changed).toHaveBeenCalledTimes(2);
	expect(document.getElementById("credits_roles_1")).toBe(role);
	expect(page.roleinputEl).toBe(focused);
	await expect(updateCreditDetails("missing", "producer", "")).rejects.toThrow(
		"Could not find the credit fields",
	);
});
