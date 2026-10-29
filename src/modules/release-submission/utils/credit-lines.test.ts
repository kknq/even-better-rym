// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { addCreditLine } from "./credit-lines";
import { addArtistCredit } from "./page-functions";

vi.mock("./page-functions", () => ({ addArtistCredit: vi.fn() }));
afterEach(() => {
	vi.clearAllMocks();
	document.body.replaceChildren();
});

test("identifies the added row rather than assuming it is last", async () => {
	document.body.innerHTML =
		'<ul id="creditsx"><li id="credits_1" class="sortable_credit"></li></ul>';
	vi.mocked(addArtistCredit).mockImplementation(() => {
		document
			.querySelector("#creditsx")
			?.insertAdjacentHTML(
				"afterbegin",
				'<li id="credits_2" class="sortable_credit"></li>',
			);
		return Promise.resolve();
	});
	expect(
		await addCreditLine({
			id: "123",
			name: "Guest",
			role: "guest",
			tracks: "1",
		}),
	).toBe("2");
});

test("reports failure rather than claiming an unrelated row", async () => {
	document.body.innerHTML =
		'<ul id="creditsx"><li id="credits_1" class="sortable_credit"></li></ul>';
	vi.mocked(addArtistCredit).mockResolvedValue(undefined);
	await expect(
		addCreditLine({ id: undefined, name: "Guest", role: "guest", tracks: "1" }),
	).rejects.toThrow("Could not identify");
});
