// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
	editTracklistText,
	waitForTracklistEdits,
} from "../utils/simple-tracklist";
import injectTracklistControls from "./tracklist-controls";

vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("../utils/page-functions", () => ({
	showAdvancedTracklist: vi.fn(),
	showSimpleTracklist: vi.fn(),
}));

beforeEach(() => {
	document.body.innerHTML = `
		<form>
			<div id="copyBox" style="float: right; width: 300px">
				<input id="copy_id">
				<input type="button" value="Copy Tracks">
			</div>
			<table id="toolbar"><tbody><tr>
				<td>
					<a id="addTrack" class="btn blue_btn btn_small rating_btn">add track</a>
					<a id="clearAll" class="btn blue_btn btn_small rating_btn" style="margin-left: 1em">clear all</a>
				</td>
				<td>
					[ <a id="goSimpleBtn" class="btn blue_btn btn_small">Simple</a> |
					<a id="goAdvancedBtn" class="btn flat_btn btn_small">Advanced</a> ]
					<a id="insertLink" class="btn blue_btn btn_small rating_btn">Insert link to artist or work</a>
				</td>
			</tr><tr id="advancedhelp" style="display: none"><td colspan="2">Help</td></tr></tbody></table>
			<button id="unrelated" type="button" style="margin-left: 1em">Unrelated</button>
			<div id="tracks_simp">
				<table><tbody>
					<tr id="track_base"><td><input id="track_track_title"></td></tr>
					<tr id="track_1">
						<td><input id="track_track_number1" value="A1"></td>
						<td><input id="track_track_title1" value="THE SOUND OF MUSIC"></td>
						<td><input id="track_track_length1" value="3:42"></td>
					</tr>
					<tr id="track_2">
						<td><input id="track_track_number2" value="A1"></td>
						<td><input id="track_track_title2" value="a walk in the park"></td>
						<td><input id="track_track_length2" value=""></td>
					</tr>
				</tbody></table>
			</div>
			<div id="tracks_adv" style="display: none">
				<textarea id="track_advanced"></textarea>
			</div>
		</form>`;
});

afterEach(async () => {
	await waitForTracklistEdits();
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

function input(id: string): HTMLInputElement {
	const element = document.getElementById(id);
	if (!(element instanceof HTMLInputElement)) {
		throw new Error(`Missing input: ${id}`);
	}
	return element;
}

function clickCaseButton(label: string): void {
	const button = [
		...document.querySelectorAll<HTMLButtonElement>(
			".ebr-tracklist-toolbar button",
		),
	].find((element) => element.textContent === label);
	if (!button) throw new Error(`Missing button: ${label}`);
	button.click();
}

test("adds non-submit buttons beside the existing tracklist controls", async () => {
	await injectTracklistControls();
	const buttons = [
		...document.querySelectorAll<HTMLButtonElement>(
			".ebr-tracklist-toolbar button",
		),
	];
	expect(buttons.map((button) => button.textContent)).toEqual([
		"convert to sentence case",
		"convert to title case",
	]);
	expect(buttons.every((button) => button.type === "button")).toBe(true);
	expect(buttons[0].parentElement?.className).toBe(
		"ebr-tracklist-case-controls",
	);
});

test("keeps all toolbar groups on one scrollable line without changing unrelated styles or handlers", async () => {
	const nativeIds = [
		"addTrack",
		"clearAll",
		"goSimpleBtn",
		"goAdvancedBtn",
		"insertLink",
	];
	const nativeButtons = nativeIds.map((id) => document.getElementById(id));
	const originalClasses = nativeButtons.map((button) => button?.className);
	const click = vi.fn();
	for (const button of nativeButtons) button?.addEventListener("click", click);
	const unrelatedMarkup = document.getElementById("unrelated")?.outerHTML;
	const helpMarkup = document.getElementById("advancedhelp")?.outerHTML;
	const copyMarkup = document.getElementById("copyBox")?.outerHTML;

	await injectTracklistControls();

	const toolbar = document.querySelector<HTMLElement>(".ebr-tracklist-toolbar");
	expect(toolbar?.style.display).toBe("flex");
	expect(toolbar?.style.width).toBe("max-content");
	const scroll = toolbar?.parentElement;
	expect(scroll?.className).toBe("ebr-tracklist-toolbar-scroll");
	expect(scroll?.style.overflowX).toBe("auto");
	expect(scroll?.style.maxWidth).toBe("100%");
	expect(scroll?.style.background).toBe("");
	expect(scroll?.style.border).toBe("");
	expect(toolbar?.style.background).toBe("var(--mono-f4)");
	expect(toolbar?.style.border).toBe("1px solid var(--mono-e8)");
	expect(toolbar?.style.padding).toBe("0.33em");
	expect(toolbar?.style.boxSizing).toBe("border-box");
	expect(scroll?.tabIndex).toBe(0);
	expect(scroll?.getAttribute("aria-label")).toBe("Tracklist controls");
	expect(scroll?.nextElementSibling?.id).toBe("toolbar");
	const groups = [
		...document.querySelectorAll<HTMLElement>(".ebr-tracklist-toolbar > div"),
	];
	expect(
		groups.map((group) =>
			[...group.children].map((button) => button.textContent),
		),
	).toEqual([
		["add track", "clear all", "clear lengths"],
		["Simple", "Advanced", "Insert link to artist or work"],
		["convert to sentence case", "convert to title case"],
	]);
	expect(groups[1].textContent).toBe(
		"[Simple|Advanced]Insert link to artist or work",
	);
	for (const [index, group] of groups.entries()) {
		expect(group.style.display).toBe("flex");
		expect(group.style.alignItems).toBe("center");
		expect(group.style.gap).toBe("0.35em");
		expect(group.style.flexShrink).toBe("0");
		if (index > 0) {
			expect(group.style.borderLeft).toBe("1px solid var(--mono-d)");
			expect(group.style.paddingLeft).toBe("0.5em");
		}
		for (const button of group.children) {
			expect(button).toHaveProperty("style.margin", "0px");
			expect(button).toHaveProperty("style.whiteSpace", "nowrap");
			expect(button).toHaveProperty("style.flexShrink", "0");
		}
	}
	expect(document.querySelectorAll("#toolbar tr")).toHaveLength(1);
	for (const [index, id] of nativeIds.entries()) {
		const button = document.getElementById(id);
		expect(button).toBe(nativeButtons[index]);
		expect(button?.className).toBe(originalClasses[index]);
		button?.click();
	}
	expect(click).toHaveBeenCalledTimes(nativeIds.length);
	expect(document.getElementById("unrelated")?.outerHTML).toBe(unrelatedMarkup);
	expect(document.getElementById("advancedhelp")?.outerHTML).toBe(helpMarkup);
	expect(document.getElementById("copyBox")?.outerHTML).toBe(copyMarkup);
});

test("converts simple titles in place, preserves other fields and notifies edit listeners", async () => {
	await injectTracklistControls();
	const firstTitle = input("track_track_title1");
	const change = vi.fn();
	document.querySelector("form")?.addEventListener("change", change);

	clickCaseButton("convert to sentence case");
	await waitForTracklistEdits();

	expect(input("track_track_title1")).toBe(firstTitle);
	expect(firstTitle.value).toBe("The sound of music");
	expect(input("track_track_title2").value).toBe("A walk in the park");
	expect(input("track_track_number1").value).toBe("A1");
	expect(input("track_track_number2").value).toBe("A1");
	expect(input("track_track_length1").value).toBe("3:42");
	expect(input("track_track_length2").value).toBe("");
	expect(input("track_track_title").value).toBe("");
	expect(document.getElementById("tracks_adv")?.style.display).toBe("none");
	expect(change).toHaveBeenCalledOnce();

	clickCaseButton("convert to title case");
	await waitForTracklistEdits();
	expect(firstTitle.value).toBe("The Sound of Music");
	expect(input("track_track_title2").value).toBe("A Walk in the Park");
});

test("converts advanced text without switching modes or removing non-title fields", async () => {
	await injectTracklistControls();
	const advanced = document.getElementById("tracks_adv");
	if (!advanced) throw new Error("Missing advanced editor");
	advanced.style.display = "";
	const textarea = document.querySelector("textarea");
	if (!textarea) throw new Error("Missing advanced input");
	textarea.value =
		"H|[b]BONUS TRACKS[/b]|\n\nB1|[Artist123,AC/DC] - A WALK IN THE PARK|04:05|extra\nB2|[untitled]|\nnot a track";

	clickCaseButton("convert to sentence case");
	await waitForTracklistEdits();

	expect(textarea.value).toBe(
		"H|[b]Bonus tracks[/b]|\n\nB1|[Artist123,AC/DC] - A walk in the park|04:05|extra\nB2|[untitled]|\nnot a track",
	);
	expect(advanced.style.display).toBe("");
});

test("converts the latest queued edit instead of a stale snapshot", async () => {
	await injectTracklistControls();
	const earlier = editTracklistText(
		() => "A1|another song title|3:42\nA1|old|",
	);
	clickCaseButton("convert to title case");
	await earlier;
	await waitForTracklistEdits();
	expect(input("track_track_title1").value).toBe("Another Song Title");
});
