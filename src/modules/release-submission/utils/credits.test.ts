// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import { fillFiledUnderCredits, getFiledUnderArtists } from "./credits";
import { selectShortcut } from "./page-functions";

vi.mock("./page-functions", () => ({ selectShortcut: vi.fn() }));
vi.mock("webextension-polyfill", () => ({ default: {} }));

function artistRow(id = 1410333, name = "Tasker") {
	return `<li class="sortable_filed_under_performer">
		<div class="filed_under_artist">
			<input value="[Artist${id}]">
			<div class="filed_under_artist_preview">
				<a class="artist" title="[Artist${id}]">${name}</a>
			</div>
		</div>
	</li>`;
}

function creditRow(id = 1410333, role = "", tracks = "", label = "") {
	return `<li class="sortable_credit">
		<div class="credits_artist"><input value="[Artist${id}${label ? `,${label}` : ""}]"></div>
		<div class="credits_roles"><input value="${role}"></div>
		<div class="credits_tracks"><input value="${tracks}"></div>
	</li>`;
}

describe("filed-under artist credits", () => {
	beforeEach(() => {
		vi.mocked(selectShortcut).mockReset();
		vi.mocked(selectShortcut).mockImplementation((_type, id) => {
			document
				.querySelector("#creditsx")
				?.insertAdjacentHTML("beforeend", creditRow(id));
			return Promise.resolve();
		});
		document.body.innerHTML = `<ul>${artistRow()}</ul><ul id="creditsx"></ul>`;
	});

	test("reads the actual performer markup and deduplicates selected artists", () => {
		document.body.insertAdjacentHTML("beforeend", `<ul>${artistRow()}</ul>`);
		expect(getFiledUnderArtists()).toEqual([{ id: 1410333, name: "Tasker" }]);
	});

	test("supports named shortcuts without needing a search", () => {
		const input = document.querySelector<HTMLInputElement>(
			".filed_under_artist input",
		);
		if (!input) throw new Error("Missing artist");
		input.value = "[Artist1410333,Nic Tasker]";
		document.querySelector("a.artist")?.removeAttribute("title");
		expect(getFiledUnderArtists()).toEqual([{ id: 1410333, name: "Tasker" }]);
	});

	test("credits selected performers, but not composers", async () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			`<ul>${artistRow(123, "Second DJ")}${artistRow(456, "Composer").replace("sortable_filed_under_performer", "sortable_filed_under_composer")}</ul>`,
		);
		await fillFiledUnderCredits("DJ mixing");
		expect(selectShortcut).toHaveBeenNthCalledWith(
			1,
			"a",
			1410333,
			"Tasker",
			"credits",
		);
		expect(selectShortcut).toHaveBeenNthCalledWith(
			2,
			"a",
			123,
			"Second DJ",
			"credits",
		);
		expect(selectShortcut).toHaveBeenCalledTimes(2);
		expect(
			[
				...document.querySelectorAll<HTMLInputElement>(".credits_roles input"),
			].map((input) => input.value),
		).toEqual(["DJ mixing", "DJ mixing"]);
	});

	test("preserves other roles and does not duplicate credits on reimport", async () => {
		document
			.querySelector("#creditsx")
			?.insertAdjacentHTML(
				"beforeend",
				creditRow(1410333, "Producer", "", "Nic Tasker"),
			);
		await fillFiledUnderCredits("DJ mixing");
		await fillFiledUnderCredits("DJ mixing");
		expect(
			document.querySelector<HTMLInputElement>(".credits_roles input")?.value,
		).toBe("Producer, DJ mixing");
		expect(selectShortcut).not.toHaveBeenCalled();
	});

	test("recognizes an existing role regardless of capitalization", async () => {
		document
			.querySelector("#creditsx")
			?.insertAdjacentHTML("beforeend", creditRow(1410333, "DJ Mixing"));
		await fillFiledUnderCredits("DJ mixing");
		expect(
			document.querySelector<HTMLInputElement>(".credits_roles input")?.value,
		).toBe("DJ Mixing");
		expect(selectShortcut).not.toHaveBeenCalled();
	});

	test("does not duplicate a role already present on a later credit for the same artist", async () => {
		document
			.querySelector("#creditsx")
			?.insertAdjacentHTML(
				"beforeend",
				creditRow(1410333, "Producer") + creditRow(1410333, "DJ mixing"),
			);
		await fillFiledUnderCredits("DJ mixing");
		expect(
			[
				...document.querySelectorAll<HTMLInputElement>(".credits_roles input"),
			].map((input) => input.value),
		).toEqual(["Producer", "DJ mixing"]);
		expect(selectShortcut).not.toHaveBeenCalled();
	});

	test("does not turn a track-specific credit into a release-wide one", async () => {
		document
			.querySelector("#creditsx")
			?.insertAdjacentHTML("beforeend", creditRow(1410333, "Producer", "2"));
		await fillFiledUnderCredits("DJ mixing");
		expect(
			[
				...document.querySelectorAll<HTMLInputElement>(".credits_roles input"),
			].map((input) => input.value),
		).toEqual(["Producer", "DJ mixing"]);
		expect(
			document.querySelector<HTMLInputElement>(".credits_tracks input")?.value,
		).toBe("2");
	});

	test("does not invent artist IDs when the submission has no selected artist", async () => {
		document.body.innerHTML = '<ul id="creditsx"></ul>';
		await fillFiledUnderCredits("DJ mixing");
		expect(selectShortcut).not.toHaveBeenCalled();
	});

	test("reports failed credit insertion instead of editing another artist", async () => {
		vi.mocked(selectShortcut).mockImplementation(() => {
			document
				.querySelector("#creditsx")
				?.insertAdjacentHTML("beforeend", creditRow(999, "Producer"));
			return Promise.resolve();
		});
		await expect(fillFiledUnderCredits("DJ mixing")).rejects.toThrow(
			"Could not add DJ mixing credit for Tasker",
		);
		expect(
			document.querySelector<HTMLInputElement>(".credits_roles input")?.value,
		).toBe("Producer");
	});
});
