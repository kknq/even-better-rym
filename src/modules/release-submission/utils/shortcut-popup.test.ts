// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";
import { openArtistLinkPopup } from "./page-functions";
import { reportSubmissionError } from "./report-error";

vi.mock("./page-functions", () => ({
	openArtistLinkPopup: vi.fn().mockResolvedValue(undefined),
	closeShortcutPopup: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("./report-error", () => ({ reportSubmissionError: vi.fn() }));

import {
	parseArtistResultId,
	prefillArtistSearch,
	startArtistSearch,
	watchArtistResultClicks,
} from "./shortcut-popup";

afterEach(() => {
	document.body.replaceChildren();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

test.each([
	{
		target: "#artistname1109839",
		id: "1109839",
		name: "Андрей Бобровко [Andrey Bobrovko]",
	},
	{
		target: "#infobox1109839 .subinfo",
		id: "1109839",
		name: "Андрей Бобровко [Andrey Bobrovko]",
	},
	{ target: "#img_a_1986073", id: "1986073", name: "Andrea Andreu" },
])("reads the ID-specific name from saved RYM result markup ($target)", ({
	target,
	id,
	name,
}) => {
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	const doc =
		document.querySelector<HTMLIFrameElement>("iframe")?.contentDocument;
	if (!doc) throw new Error("Missing frame document");
	doc.body.innerHTML = `
		<div onclick="window.parent.createShortcut('a', '1109839');return false;">
			<table><tbody><tr id="infobox1109839" class="infobox">
				<td style="width:52px;"></td><td style="padding-left:15px;">
					<b><span id="artistname1109839">Андрей Бобровко [Andrey Bobrovko]</span></b>
					<span class="subinfo">a.k.a: Андрей Николаевич Бобровко, Андрэй Баброўка, Andrei Babrouka<br>
						<div>Sound engineer from Minsk, Belarus</div>
					</span>
				</td>
			</tr></tbody></table>
		</div>
		<div onclick="window.parent.createShortcut('a', '1986073');return false;">
			<table><tbody><tr id="infobox1986073" class="infobox">
				<td style="width:52px;">
					<a href="javascript:window.parent.createShortcut('a', '1986073');return false;">
						<img width="50" id="img_a_1986073" alt="Legado" title="Legado" src="13534785">
					</a>
				</td><td style="padding-left:15px;">
					<b><span id="artistname1986073">Andrea Andreu</span></b>
					<span class="subinfo"><div>Born 6 February 1980</div></span>
				</td>
			</tr></tbody></table>
		</div>`;
	const picked = vi.fn();
	const stop = watchArtistResultClicks(picked, "picker", vi.fn());
	try {
		doc.querySelector<HTMLElement>(target)?.click();
		expect(picked).toHaveBeenCalledExactlyOnceWith(id, name);
		expect(reportSubmissionError).not.toHaveBeenCalled();
	} finally {
		stop();
	}
});

test.each([
	`<table><tr onclick="createShortcut('a', '1238361')">
		<td><a href="/help/">Help</a></td>
		<td><a href="/artist/molchat-doma">Молчат Дома</a><small>Belarus, 2017–present</small></td>
	</tr></table>`,
	`<table><tr>
		<td><a onclick="createShortcut('a', '1238361')"><img alt="Insert artist" src="icon.png"></a></td>
		<td><a href="https://rateyourmusic.com/artist/molchat-doma">Молчат Дома</a><span>[Molchat Doma]</span></td>
	</tr></table>`,
	`<ul><li>
		<a onclick="createShortcut('a', '1238361')"><i>+</i></a>
		<a href="/artist/molchat-doma">  Молчат
			Дома  </a><span>Post-Punk</span>
	</li></ul>`,
])("reads the artist profile link rather than icons, other links or row metadata (%#)", (markup) => {
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	const frame = document.querySelector<HTMLIFrameElement>("iframe");
	const doc = frame?.contentDocument;
	if (!doc) throw new Error("Missing frame document");
	doc.body.innerHTML = markup;
	const picked = vi.fn();
	const stop = watchArtistResultClicks(picked, "picker", vi.fn());
	try {
		doc.querySelector<HTMLElement>("[onclick]")?.click();
		expect(picked).toHaveBeenCalledExactlyOnceWith("1238361", "Молчат Дома");
	} finally {
		stop();
	}
});

test("reports an unidentified result name without choosing a bare token, and allows retry", () => {
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	const doc =
		document.querySelector<HTMLIFrameElement>("iframe")?.contentDocument;
	if (!doc) throw new Error("Missing frame document");
	doc.body.innerHTML = `<a onclick="createShortcut('a', '1238361')"><img alt="Insert" src="icon.png"></a>`;
	const picked = vi.fn();
	const stop = watchArtistResultClicks(picked, "picker", vi.fn());
	try {
		doc.querySelector("a")?.click();
		expect(picked).not.toHaveBeenCalled();
		expect(reportSubmissionError).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Could not identify the selected RYM artist name",
			}),
		);
		doc.body.innerHTML = `<a onclick="createShortcut('a', '1238361')" href="/artist/molchat-doma">Молчат Дома</a>`;
		doc.querySelector("a")?.click();
		expect(picked).toHaveBeenCalledExactlyOnceWith("1238361", "Молчат Дома");
	} finally {
		stop();
	}
});

test("does not intercept manual Insert link clicks after closing or changing the popup target", () => {
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	const frame = document.querySelector<HTMLIFrameElement>("iframe");
	const doc = frame?.contentDocument;
	if (!doc) throw new Error("Missing frame document");
	doc.body.innerHTML = `<a href="/artist/artist" onclick="createShortcut('a', '123')">Artist</a>`;
	Object.defineProperty(doc.defaultView, "createShortcut", { value: vi.fn() });
	const picked = vi.fn();
	const cancelled = vi.fn();
	const stop = watchArtistResultClicks(picked, "picker", cancelled);
	try {
		doc.querySelector("a")?.click();
		expect(picked).toHaveBeenCalledExactlyOnceWith("123", "Artist");
		document.dispatchEvent(
			new CustomEvent("EbrShortcutPopupEvent", {
				detail: { targetId: "track_title" },
			}),
		);
		doc.querySelector("a")?.click();
		expect(picked).toHaveBeenCalledOnce();
		expect(cancelled).toHaveBeenCalledOnce();
	} finally {
		stop();
	}
});

test("awaits opening the popup before navigating its frame", async () => {
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	let open: (() => void) | undefined;
	vi.mocked(openArtistLinkPopup).mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				open = resolve;
			}),
	);
	const search = startArtistSearch("picker", "Name");
	const frame = document.querySelector<HTMLIFrameElement>("iframe");
	expect(frame?.getAttribute("src")).toBeNull();
	document.dispatchEvent(
		new CustomEvent("EbrShortcutPopupEvent", { detail: {} }),
	);
	open?.();
	await search;
	expect(frame?.getAttribute("src")).toBeNull();
});

test("times out a search whose frame never loads", async () => {
	vi.useFakeTimers();
	document.body.innerHTML = '<iframe id="shortcutsearchframe"></iframe>';
	const search = prefillArtistSearch("Name");
	const assertion = expect(search).rejects.toThrow("Artist search timed out");
	await vi.advanceTimersByTimeAsync(10_000);
	await assertion;
});

describe("parseArtistResultId", () => {
	test("reads the artist id from a result row's onclick", () => {
		expect(
			parseArtistResultId(
				"window.parent.createShortcut('a', '1639184');return false;",
			),
		).toBe("1639184");
	});

	test("ignores non-artist shortcuts", () => {
		expect(
			parseArtistResultId("window.parent.createShortcut('b', '42');"),
		).toBeUndefined();
	});

	test("ignores text with no shortcut call", () => {
		expect(parseArtistResultId("")).toBeUndefined();
		expect(parseArtistResultId("navArtist(5)")).toBeUndefined();
	});
});
