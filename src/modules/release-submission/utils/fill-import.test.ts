// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import { runScript, waitForResult } from "~/shared/utils/dom";
import { fill } from "./fillers";
import type { ReleaseOptions } from "./types";

vi.mock("~/shared/utils/dom", () => ({
	forceQuerySelector: (parent: ParentNode) => (selector: string) => {
		const element = parent.querySelector(selector);
		if (!element) throw new Error(`Missing element: ${selector}`);
		return element;
	},
	runScript: vi.fn().mockResolvedValue(undefined),
	waitForResult: vi.fn().mockResolvedValue(undefined),
}));

const options: ReleaseOptions = {
	capitalization: "as-is",
	preserveTrackLengths: false,
	fillFields: {
		artists: true,
		tracks: true,
		type: false,
		date: false,
		title: false,
		format: false,
		discSize: false,
		label: false,
		attributes: false,
		countries: false,
		credits: false,
	},
};

describe("release import artist modes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(runScript).mockReset().mockResolvedValue(undefined);
		document.body.innerHTML = `
			<div id="section_filed_under">
				<input id="filed_under_searchterm">
				<div class="gosearch"><input type="button"></div>
				<iframe id="filed_underperformerlist"></iframe>
			</div>
			<textarea id="track_advanced"></textarea>
		`;
	});

	test("fills NTS artist and track text without searches, links, or lengths", async () => {
		const search = vi.fn();
		document
			.querySelector('input[type="button"]')
			?.addEventListener("click", search);
		await fill(
			{
				artists: ["NIC TASKER"],
				artistMode: "text",
				tracks: [
					{ position: "1", title: "Evan Parker With Birds - Side A / Track 2" },
				],
			},
			options,
		);
		expect(
			document.querySelector<HTMLInputElement>("#filed_under_searchterm")
				?.value,
		).toBe("NIC TASKER");
		expect(search).not.toHaveBeenCalled();
		expect(waitForResult).not.toHaveBeenCalled();
		expect(
			document.querySelector<HTMLTextAreaElement>("#track_advanced")?.value,
		).toBe("1|Evan Parker With Birds - Side A / Track 2|");
		expect(runScript).toHaveBeenCalledTimes(2);
	});

	test("retains automatic artist lookup for existing services", async () => {
		const search = vi.fn();
		document
			.querySelector('input[type="button"]')
			?.addEventListener("click", search);
		await fill({ artists: ["Existing Artist"] }, options);
		expect(search).toHaveBeenCalledOnce();
		expect(waitForResult).toHaveBeenCalledOnce();
	});

	test("respects the artists import option for text-only names", async () => {
		await fill(
			{ artists: ["NIC TASKER"], artistMode: "text" },
			{ ...options, fillFields: { ...options.fillFields, artists: false } },
		);
		expect(
			document.querySelector<HTMLInputElement>("#filed_under_searchterm")
				?.value,
		).toBe("");
		expect(waitForResult).not.toHaveBeenCalled();
	});

	test("adds NTS classifier, no-label settings, and DJ credit for the selected artist", async () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			`<input id="va_classifiers" value="[Descriptor123]">
			<input id="label" value="0">
			<input id="catalog_no">
			<ul><li class="sortable_filed_under_performer"><div class="filed_under_artist">
				<input value="[Artist1410333]"><a class="artist" title="[Artist1410333]">Tasker</a>
			</div></li></ul>
			<ul id="creditsx"></ul>`,
		);
		vi.mocked(runScript).mockImplementation((script) => {
			if (script === "goInfobox(897)") {
				const label = document.querySelector<HTMLInputElement>("#label");
				if (label) label.value = "897";
			}
			if (script.startsWith("selectShortcut(")) {
				document.querySelector("#creditsx")?.insertAdjacentHTML(
					"beforeend",
					`<li class="sortable_credit">
						<div class="credits_artist"><input value="[Artist1410333]"></div>
						<div class="credits_roles"><input></div>
						<div class="credits_tracks"><input></div>
					</li>`,
				);
			}
			return Promise.resolve();
		});
		const data = {
			classifiers: ["[Descriptor60311]"],
			label: { id: 897, name: "(No Label)", catno: "n/a" },
			filedUnderCreditRole: "DJ mixing",
		};
		const ntsOptions = {
			...options,
			fillFields: {
				...options.fillFields,
				label: true,
				credits: true,
			},
		};
		await fill(data, ntsOptions);
		await fill(data, ntsOptions);
		expect(
			document.querySelector<HTMLInputElement>("#va_classifiers")?.value,
		).toBe("[Descriptor123] [Descriptor60311]");
		expect(document.querySelector<HTMLInputElement>("#label")?.value).toBe(
			"897",
		);
		expect(document.querySelector<HTMLInputElement>("#catalog_no")?.value).toBe(
			"n/a",
		);
		expect(
			document.querySelector<HTMLInputElement>(".credits_roles input")?.value,
		).toBe("DJ mixing");
		expect(document.querySelectorAll("#creditsx li")).toHaveLength(1);
		expect(waitForResult).not.toHaveBeenCalled();
	});

	test("always fills classifiers but respects disabled label and credit fields", async () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			'<input id="va_classifiers"><input id="catalog_no">',
		);
		await fill(
			{
				classifiers: ["[Descriptor60311]"],
				label: { id: 897, name: "(No Label)", catno: "n/a" },
				filedUnderCreditRole: "DJ mixing",
			},
			options,
		);
		expect(runScript).not.toHaveBeenCalled();
		expect(
			document.querySelector<HTMLInputElement>("#va_classifiers")?.value,
		).toBe("[Descriptor60311]");
		expect(document.querySelector<HTMLInputElement>("#catalog_no")?.value).toBe(
			"",
		);
	});

	test("continues filling remaining fields when an earlier step fails", async () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			'<input id="va_classifiers"><input id="label"><input id="catalog_no">',
		);
		vi.mocked(runScript).mockImplementation((script) =>
			script.startsWith("document.querySelector('#goAdvancedBtn')")
				? Promise.reject(new Error("tracks failed"))
				: Promise.resolve(),
		);
		await expect(
			fill(
				{
					tracks: [{ position: "1", title: "Track" }],
					classifiers: ["[Descriptor60311]"],
					label: { id: 897, name: "(No Label)", catno: "n/a" },
				},
				{ ...options, fillFields: { ...options.fillFields, label: true } },
			),
		).rejects.toThrow("tracks failed");
		expect(runScript).toHaveBeenCalledWith("goInfobox(897)");
		expect(document.querySelector<HTMLInputElement>("#catalog_no")?.value).toBe(
			"n/a",
		);
		expect(
			document.querySelector<HTMLInputElement>("#va_classifiers")?.value,
		).toBe("[Descriptor60311]");
	});

	test("keeps label-name searches working for existing services", async () => {
		document.body.insertAdjacentHTML(
			"beforeend",
			`<input id="label"><table><tbody><tr><td>
				<input id="searchterm"><div class="gosearch"><input type="button" class="btn"></div>
			</td></tr></tbody></table><input id="catalog_no">`,
		);
		const search = vi.fn();
		document
			.querySelector("#label~table .btn")
			?.addEventListener("click", search);
		await fill(
			{ label: { name: "Existing Records", catno: "ABC123" } },
			{ ...options, fillFields: { ...options.fillFields, label: true } },
		);
		expect(search).toHaveBeenCalledOnce();
		expect(document.querySelector<HTMLInputElement>("#searchterm")?.value).toBe(
			"Existing Records",
		);
		expect(document.querySelector<HTMLInputElement>("#catalog_no")?.value).toBe(
			"ABC123",
		);
		expect(runScript).not.toHaveBeenCalled();
	});
});
