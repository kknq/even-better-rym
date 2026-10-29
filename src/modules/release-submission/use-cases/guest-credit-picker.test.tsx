// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, expect, test, vi } from "vitest";

import { addCreditLine, removeCreditLine } from "../utils/credit-lines";
import { closeShortcutPopup } from "../utils/page-functions";
import {
	startArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import type { ReleaseOptions } from "../utils/types";
import injectGuestCreditPicker from "./guest-credit-picker";

vi.mock("../utils/credit-lines", async (importOriginal) => ({
	...(await importOriginal<typeof import("../utils/credit-lines")>()),
	addCreditLine: vi.fn(),
	removeCreditLine: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("../utils/shortcut-popup", () => ({
	startArtistSearch: vi.fn().mockResolvedValue(undefined),
	watchArtistResultClicks: vi.fn(() => () => undefined),
}));
vi.mock("../utils/page-functions", () => ({
	closeShortcutPopup: vi.fn().mockResolvedValue(undefined),
}));

const options: ReleaseOptions = {
	capitalization: "as-is",
	preserveTrackLengths: false,
	fillFields: {
		artists: true,
		tracks: true,
		credits: true,
		type: false,
		date: false,
		title: false,
		format: false,
		discSize: false,
		label: false,
		attributes: false,
		countries: false,
	},
};

afterEach(() => {
	const container = document.querySelector("#creditsx")?.nextElementSibling;
	if (container) render(null, container);
	document.body.replaceChildren();
	vi.clearAllMocks();
});

async function setup() {
	document.body.innerHTML = '<ul id="creditsx"></ul>';
	await act(async () => {
		await injectGuestCreditPicker();
	});
	await act(() => {
		document.dispatchEvent(new CustomEvent("importEvent", { detail: {} }));
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: {
					data: {
						artists: ["Main"],
						tracks: [{ position: "1", artists: ["Guest"] }],
					},
					options,
				},
			}),
		);
	});
}

function click(value: string) {
	const button = document.querySelector<HTMLInputElement>(
		`input[value="${value}"]`,
	);
	expect(button).not.toBeNull();
	button?.click();
}

test("clears the floated artist search box before the guest panel", async () => {
	document.body.innerHTML = `
		<div id="section_credits">
			<div style="float: right"><input id="credit_searchterm"></div>
			<ul id="creditsx"></ul>
		</div>
	`;
	await act(async () => {
		await injectGuestCreditPicker();
	});

	const container = document.querySelector<HTMLDivElement>("#creditsx + div");
	expect(container).toBeInstanceOf(HTMLDivElement);
	expect(container?.style.clear).toBe("both");
	expect(container?.style.paddingTop).toBe("0.5em");
});

test("serializes rapid Text/Text/Skip choices using the latest added line", async () => {
	let finish: ((line: string) => void) | undefined;
	vi.mocked(addCreditLine)
		.mockImplementationOnce(
			() =>
				new Promise<string>((resolve) => {
					finish = resolve;
				}),
		)
		.mockResolvedValue("2");
	await setup();
	await act(() => {
		click("Credit in plain text");
		click("Credit in plain text");
		click("Don't credit");
	});
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledOnce());
	await act(() => {
		finish?.("1");
	});
	await vi.waitFor(() => expect(removeCreditLine).toHaveBeenCalledWith("2"));
	expect(addCreditLine).toHaveBeenCalledTimes(2);
	expect(vi.mocked(removeCreditLine).mock.calls).toEqual([["1"], ["2"]]);
});

test("abandons queued work after a new import and retains existing credits", async () => {
	let finish: ((line: string) => void) | undefined;
	vi.mocked(addCreditLine).mockImplementationOnce(
		() =>
			new Promise<string>((resolve) => {
				finish = resolve;
			}),
	);
	await setup();
	await act(() => {
		click("Credit in plain text");
		click("Credit in plain text");
	});
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledOnce());
	await act(() => {
		document.dispatchEvent(new CustomEvent("importEvent", { detail: {} }));
	});
	await act(() => {
		finish?.("1");
	});
	expect(addCreditLine).toHaveBeenCalledOnce();
	expect(removeCreditLine).not.toHaveBeenCalled();
});

test("does not offer guest credits when credits are disabled", async () => {
	await setup();
	await act(() => {
		document.dispatchEvent(new CustomEvent("importEvent", { detail: {} }));
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: {
					data: { tracks: [{ artists: ["Guest"] }] },
					options: {
						...options,
						fillFields: { ...options.fillFields, credits: false },
					},
				},
			}),
		);
	});
	expect(document.querySelector("#ebr-guest-credit-picker")).toBeNull();
});

test("selecting a guest does not start searching for the next guest", async () => {
	vi.mocked(addCreditLine).mockResolvedValue("1");
	await setup();
	await act(() => {
		document.dispatchEvent(
			new CustomEvent("importCompleteEvent", {
				detail: {
					data: {
						artists: ["Main"],
						tracks: [{ position: "1", artists: ["Guest", "Other guest"] }],
					},
					options,
				},
			}),
		);
	});
	await act(() => click("Find on RYM"));
	expect(startArtistSearch).toHaveBeenCalledExactlyOnceWith(
		"ebr-guest-credit-picker",
		"Guest",
	);
	await act(() => {
		vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("123");
	});
	await vi.waitFor(() => expect(addCreditLine).toHaveBeenCalledOnce());
	expect(startArtistSearch).toHaveBeenCalledTimes(1);
	await vi.waitFor(() =>
		expect(
			document.querySelector('input[value="Replace artist link"]'),
		).not.toBeNull(),
	);
	expect(closeShortcutPopup).toHaveBeenCalledOnce();
	expect(document.querySelector('input[value="Cancel selection"]')).toBeNull();
});
