// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { expect, test, vi } from "vitest";

import { runScript } from "~/shared/utils/dom";
import { importRelease } from "../utils/import-release";
import {
	startArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import type { ReleaseOptions } from "../utils/types";
import injectArtistLinkPicker from "./artist-link-picker";

vi.mock("webextension-polyfill", () => ({ default: {} }));
vi.mock("../utils/shortcut-popup", () => ({
	cancelPendingArtistSearch: vi.fn(),
	startArtistSearch: vi.fn().mockResolvedValue(undefined),
	watchArtistResultClicks: vi.fn(() => () => undefined),
}));
vi.mock("~/shared/utils/messaging", () => ({ sendBackgroundMessage: vi.fn() }));
vi.mock("~/shared/utils/dom", async (importOriginal) => ({
	...(await importOriginal<typeof import("~/shared/utils/dom")>()),
	runScript: vi.fn().mockResolvedValue(undefined),
}));

test.each([
	undefined,
	"Tom Schley",
])("shows an accessible error indicator instead of adding an unlinked main artist (label=%s)", async (label) => {
	document.body.innerHTML = `
			<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
			<div id="tracks_adv"><textarea id="track_advanced">1|First|</textarea></div></div>
		`;
	await act(async () => {
		await injectArtistLinkPicker();
	});
	const container = document.querySelector("#tracks_adv")?.nextElementSibling;
	try {
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistLabelsEvent", {
					detail: {
						names: ["Tom Schley"],
						labels: new Map(label === undefined ? [] : [["Tom Schley", label]]),
					},
				}),
			);
			document.dispatchEvent(
				new CustomEvent("importCompleteEvent", {
					detail: {
						data: {
							artists: ["Tom Schley"],
							tracks: [{ position: "1", title: "First" }],
						},
						options: { fillFields: { tracks: true } },
					},
				}),
			);
		});
		const button = document.querySelector<HTMLInputElement>(
			'input[value="Add to track titles"]',
		);
		expect(button).not.toBeNull();
		expect(button?.disabled).toBe(false);
		await act(() => button?.click());
		const error = document.querySelector<HTMLElement>('[role="alert"]');
		const indicator = error?.querySelector("button");
		expect(indicator?.querySelector("svg")?.getAttribute("width")).toBe("24");
		expect(indicator?.getAttribute("aria-label")).toBe(
			'Link Tom Schley to a RYM artist first, or use "Put in plain text".',
		);
		expect(error?.style.width).toBe("24px");
		expect(error?.parentElement?.style.minHeight).toBe("");
		expect(error?.previousElementSibling?.tagName).toBe("SELECT");
		expect(document.querySelector("textarea")?.value).toBe("1|First|");

		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistLabelsEvent", {
					detail: {
						names: ["Tom Schley"],
						labels: new Map([["Tom Schley", "[Artist2111224]"]]),
					},
				}),
			);
		});
		expect(document.querySelector('[role="alert"]')).toBeNull();
		expect(indicator?.isConnected).toBe(false);
		await act(() => button?.click());
		await vi.waitFor(() =>
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist2111224] - First|",
			),
		);
	} finally {
		if (container) render(null, container);
		document.body.replaceChildren();
	}
});

test("bases picker titles on the completed import, not the pre-import tracklist", async () => {
	document.body.innerHTML = `
		<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
		<div id="tracks_adv"><textarea id="track_advanced">1|Old title|</textarea></div></div>
		<input id="catalog_no">
	`;
	const options: ReleaseOptions = {
		capitalization: "as-is",
		preserveTrackLengths: false,
		fillFields: {
			artists: false,
			tracks: true,
			label: true,
			credits: false,
			type: false,
			date: false,
			title: false,
			format: false,
			discSize: false,
			attributes: false,
			countries: false,
		},
	};
	let finishLabel: (() => void) | undefined;
	vi.mocked(runScript).mockImplementation((script) =>
		script === "goInfobox(897)"
			? new Promise<void>((resolve) => {
					finishLabel = resolve;
				})
			: Promise.resolve(),
	);
	await act(async () => {
		await injectArtistLinkPicker();
	});
	const container = document.querySelector("#tracks_adv")?.nextElementSibling;
	try {
		const importing = importRelease(
			{
				artists: ["Various Artists"],
				label: { id: 897 },
				tracks: [{ position: "1", title: "New title", artists: ["Guest"] }],
			},
			options,
		);
		await act(async () => {
			await vi.waitFor(() => expect(finishLabel).toBeDefined());
		});
		expect(document.querySelector("#ebr-artist-link-picker")).toBeNull();
		await act(async () => {
			finishLabel?.();
			await importing;
		});
		await act(() => {
			document
				.querySelector<HTMLInputElement>('input[value="Put in plain text"]')
				?.click();
		});
		await vi.waitFor(() => {
			expect(document.querySelector("textarea")?.value).toBe(
				"1|Guest - New title|",
			);
		});
	} finally {
		if (container) render(null, container);
		document.body.replaceChildren();
	}
});

test("explicitly adds main artists to ordinary album titles without a new search", async () => {
	document.body.innerHTML = `
			<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
			<div id="tracks_adv"><textarea id="track_advanced">1|First|\n2|Second|</textarea></div></div>
		`;
	await act(async () => {
		await injectArtistLinkPicker();
	});
	const container = document.querySelector("#tracks_adv")?.nextElementSibling;
	try {
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistLabelsEvent", {
					detail: {
						names: ["1000 Eyes", "Tom Schley"],
						labels: new Map([
							["1000 Eyes", "[Artist1639184]"],
							["Tom Schley", "[Artist2111224]"],
						]),
					},
				}),
			);
			document.dispatchEvent(
				new CustomEvent("importCompleteEvent", {
					detail: {
						data: {
							artists: ["1000 Eyes", "Tom Schley"],
							tracks: [
								{ position: "1", title: "First" },
								{ position: "2", title: "Second" },
							],
						},
						options: { fillFields: { tracks: true } },
					},
				}),
			);
		});
		const buttons = document.querySelectorAll<HTMLInputElement>(
			'#ebr-artist-link-picker input[value="Add to track titles"]',
		);
		expect(buttons).toHaveLength(2);
		expect(document.querySelector("textarea")?.value).toBe(
			"1|First|\n2|Second|",
		);
		await act(() => buttons[0]?.click());
		await vi.waitFor(() =>
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist1639184] - First|\n2|[Artist1639184] - Second|",
			),
		);
		expect(
			document.querySelectorAll('input[value="Replace artist link"]'),
		).toHaveLength(1);
		await act(() => buttons[1]?.click());
		await vi.waitFor(() =>
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist1639184] & [Artist2111224] - First|\n2|[Artist1639184] & [Artist2111224] - Second|",
			),
		);
		expect(
			document.querySelectorAll('input[value="Replace artist link"]'),
		).toHaveLength(2);
		await act(() => {
			document.dispatchEvent(new CustomEvent("importEvent", { detail: {} }));
		});
		expect(document.querySelector("#ebr-artist-link-picker")).toBeNull();
	} finally {
		if (container) render(null, container);
		document.body.replaceChildren();
	}
});

test("selecting a track artist does not search for the next one", async () => {
	const associated = vi.fn(
		(event: CustomEvent<{ name: string; artistId: string }>) => event.detail,
	);
	document.addEventListener("artistAssociationEvent", associated);
	vi.mocked(startArtistSearch).mockClear();
	vi.mocked(watchArtistResultClicks).mockClear();
	document.body.innerHTML = `
			<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
			<div id="tracks_adv"><textarea id="track_advanced">1|First|\n2|Second|</textarea></div></div>
		`;
	await act(async () => {
		await injectArtistLinkPicker();
	});
	const container = document.querySelector("#tracks_adv")?.nextElementSibling;
	try {
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("importCompleteEvent", {
					detail: {
						data: {
							artists: ["Various Artists"],
							tracks: [
								{ position: "1", artists: ["First artist"] },
								{ position: "2", artists: ["Second artist"] },
							],
						},
						options: { fillFields: { tracks: true } },
					},
				}),
			);
		});
		await act(() => {
			document
				.querySelector<HTMLInputElement>('input[value="Find on RYM"]')
				?.click();
		});
		expect(startArtistSearch).toHaveBeenCalledExactlyOnceWith(
			"ebr-artist-link-picker",
			"First artist",
		);
		await act(() => {
			vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("123");
		});
		expect(startArtistSearch).toHaveBeenCalledTimes(1);
		expect(associated.mock.calls[0]?.[0].detail).toEqual({
			name: "First artist",
			artistId: "123",
		});
		expect(
			document.querySelector('input[value="Cancel selection"]'),
		).toBeNull();
	} finally {
		document.removeEventListener("artistAssociationEvent", associated);
		if (container) render(null, container);
		document.body.replaceChildren();
	}
});
test.each([
	false,
	true,
])("preserves the release alias in track titles (direct search=%s)", async (search) => {
	document.body.innerHTML = `
		<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
		<div id="tracks_adv"><textarea id="track_advanced">1|Gotika|</textarea></div></div>
	`;
	await act(async () => {
		await injectArtistLinkPicker();
	});
	const container = document.querySelector("#tracks_adv")?.nextElementSibling;
	try {
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistLabelsEvent", {
					detail: {
						names: ["zavet"],
						labels: new Map([["zavet", "[Artist1479561,zavet]"]]),
					},
				}),
			);
			document.dispatchEvent(
				new CustomEvent("importCompleteEvent", {
					detail: {
						data: {
							artists: ["zavet"],
							tracks: [{ position: "1", title: "Gotika", artists: ["zavet"] }],
						},
						options: { fillFields: { tracks: true } },
					},
				}),
			);
		});
		await act(() =>
			document
				.querySelector<HTMLInputElement>(
					`input[value="${search ? "Find on RYM" : "Add to track titles"}"]`,
				)
				?.click(),
		);
		if (search)
			await act(() =>
				vi.mocked(watchArtistResultClicks).mock.calls.at(-1)?.[0]("1479561"),
			);
		await vi.waitFor(() =>
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist1479561,zavet] - Gotika|",
			),
		);
	} finally {
		if (container) render(null, container);
		document.body.replaceChildren();
	}
});

test("removes a main artist without waiting for undecided guests, including undo and redo", async () => {
	document.body.innerHTML = `
		<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
		<div id="tracks_adv"><textarea id="track_advanced">1|Gotika|\n2|Guest track|</textarea></div></div>
	`;
	await act(async () => {
		await injectArtistLinkPicker();
	});
	const container = document.querySelector("#tracks_adv")?.nextElementSibling;
	const click = async (label: string) => {
		await act(() =>
			document
				.querySelector<HTMLInputElement>(`input[value="${label}"]`)
				?.click(),
		);
	};
	const expectText = async (value: string) => {
		await vi.waitFor(() =>
			expect(document.querySelector("textarea")?.value).toBe(value),
		);
	};
	try {
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistLabelsEvent", {
					detail: {
						names: ["zavet"],
						labels: new Map([["zavet", "[Artist1479561,zavet]"]]),
					},
				}),
			);
			document.dispatchEvent(
				new CustomEvent("importCompleteEvent", {
					detail: {
						data: {
							artists: ["zavet"],
							tracks: [
								{ position: "1", title: "Gotika", artists: ["zavet"] },
								{ position: "2", title: "Guest track", artists: ["Guest"] },
							],
						},
						options: { fillFields: { tracks: true } },
					},
				}),
			);
		});
		const original = "1|Gotika|\n2|Guest track|";
		const linked = "1|[Artist1479561,zavet] - Gotika|\n2|Guest track|";
		await click("Add to track titles");
		await expectText(linked);
		await click("Leave out");
		await expectText(original);
		await click("Undo");
		await expectText(linked);
		await click("Redo");
		await expectText(original);
		await click("Add to track titles");
		await expectText(linked);
		await click("Leave out");
		await expectText(original);
	} finally {
		if (container) render(null, container);
		document.body.replaceChildren();
	}
});

test("adds and removes each main artist independently on a mixed-artist release", async () => {
	document.body.innerHTML = `
		<div><div id="tracks_simp"><table><tbody><tr id="track_base"></tr></tbody></table></div>
		<div id="tracks_adv"><textarea id="track_advanced">1|Vholume|\n2|Conaptend|</textarea></div></div>
	`;
	vi.mocked(runScript).mockResolvedValue(undefined);
	await act(async () => {
		await injectArtistLinkPicker();
	});
	const container = document.querySelector("#tracks_adv")?.nextElementSibling;
	const releaseArtists = ["1000 Eyes", "Tom Schley"];
	try {
		await act(() => {
			document.dispatchEvent(
				new CustomEvent("releaseArtistLabelsEvent", {
					detail: {
						names: releaseArtists,
						labels: new Map([
							["1000 Eyes", "[Artist1639184]"],
							["Tom Schley", "[Artist2111224]"],
						]),
					},
				}),
			);
			document.dispatchEvent(
				new CustomEvent("importCompleteEvent", {
					detail: {
						data: {
							artists: releaseArtists,
							tracks: [
								{ position: "1", title: "Vholume", artists: releaseArtists },
								{
									position: "2",
									title: "Conaptend",
									artists: ["Konstantin Schimanowski"],
								},
							],
						},
						options: { fillFields: { tracks: true } },
					},
				}),
			);
		});
		expect(
			document.querySelector('input[value="Apply to tracklist"]'),
		).toBeNull();
		expect(
			document.querySelectorAll('input[value="Add to track titles"]'),
		).toHaveLength(2);
		expect(document.querySelector("textarea")?.value).toBe(
			"1|Vholume|\n2|Conaptend|",
		);
		await act(() => {
			document
				.querySelector<HTMLInputElement>(
					'#ebr-artist-link-picker input[value="Add to track titles"]',
				)
				?.click();
		});
		await vi.waitFor(() =>
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist1639184] - Vholume|\n2|Conaptend|",
			),
		);
		const textButtons = document.querySelectorAll<HTMLInputElement>(
			'input[value="Put in plain text"]',
		);
		await act(() => {
			textButtons[textButtons.length - 1]?.click();
		});
		await vi.waitFor(() => {
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist1639184] - Vholume|\n2|Konstantin Schimanowski - Conaptend|",
			);
		});
		await act(() => {
			document
				.querySelectorAll<HTMLInputElement>(
					'input[value="Add to track titles"]',
				)[1]
				?.click();
		});
		await vi.waitFor(() => {
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist1639184] & [Artist2111224] - Vholume|\n2|Konstantin Schimanowski - Conaptend|",
			);
		});
		await act(() => {
			document
				.querySelector<HTMLInputElement>('input[value="Leave out"]')
				?.click();
		});
		await vi.waitFor(() => {
			expect(document.querySelector("textarea")?.value).toBe(
				"1|[Artist2111224] - Vholume|\n2|Konstantin Schimanowski - Conaptend|",
			);
		});
	} finally {
		if (container) render(null, container);
		document.body.replaceChildren();
	}
});
