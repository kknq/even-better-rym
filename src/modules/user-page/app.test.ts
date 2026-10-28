// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchInPage } from "~/shared/utils/fetch";
import { parseMarkup } from "~/shared/utils/markup";
import { isOwnProfile } from "~/shared/utils/user";

import { main } from "./app";

vi.mock("~/shared/utils/fetch", () => ({ fetchInPage: vi.fn() }));
vi.mock("~/shared/utils/markup", () => ({ parseMarkup: vi.fn() }));
vi.mock("~/shared/utils/user", () => ({ isOwnProfile: vi.fn() }));
vi.mock("webextension-polyfill", () => ({ default: {} }));

beforeEach(async () => {
	vi.resetAllMocks();
	document.body.innerHTML = `
		<div class="bubble_header">other comments</div>
		<div class="bubble_content">
			<div><span class="rendered_text">Saved comments</span></div>
		</div>
	`;
	vi.mocked(isOwnProfile).mockReturnValue(true);
	vi.mocked(fetchInPage).mockImplementation(({ url }) => {
		if (url.endsWith("/account/reorder")) {
			return Promise.resolve('<li id="other_comments">other comments</li>');
		}
		return Promise.resolve(
			'<form id="mediumForm"><input name="fav_music" value=""><textarea name="comments">Saved comments</textarea></form>',
		);
	});
	await main();
	document.querySelector<HTMLButtonElement>(".bubble_header button")?.click();
});

function previewButton(): HTMLButtonElement {
	const button = [...document.querySelectorAll("button")].find(
		(button) => button.textContent === "preview",
	);
	if (!button) throw new Error("Missing preview button");
	return button;
}

describe("profile edit preview", () => {
	test("inserts formatted content and replaces an earlier preview", async () => {
		const rendered = document.createElement("span");
		rendered.className = "rendered_text";
		rendered.innerHTML = "first<br><br>second<div><img alt='example'></div>";
		vi.mocked(parseMarkup).mockResolvedValue(rendered);

		previewButton().click();

		await vi.waitFor(() => {
			expect(document.querySelector(".rendered_text")).toBe(rendered);
		});
		expect(rendered.querySelectorAll("br")).toHaveLength(2);
		expect(rendered.querySelector("img")).not.toBeNull();
		expect(rendered.querySelector("hr")).not.toBeNull();
		expect(previewButton().style.cursor).toBe("");
		expect(document.querySelector('svg[class*="loader"]')).toBeNull();

		const replacement = document.createElement("span");
		replacement.className = "rendered_text";
		replacement.textContent = "Updated";
		vi.mocked(parseMarkup).mockResolvedValue(replacement);
		previewButton().click();

		await vi.waitFor(() => {
			expect(document.querySelector(".rendered_text")).toBe(replacement);
		});
		expect(document.querySelectorAll(".rendered_text")).toHaveLength(1);
	});

	test("retains the last preview and unlocks controls after an error", async () => {
		const existing = document.createElement("span");
		existing.className = "rendered_text";
		existing.textContent = "Previous preview";
		document.querySelector(".bubble_content > div")?.append(existing);
		const error = new Error("Invalid preview response");
		const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.mocked(parseMarkup).mockRejectedValue(error);

		try {
			previewButton().click();

			await vi.waitFor(() => {
				expect(log).toHaveBeenCalledWith(error);
			});
			expect(document.querySelector(".rendered_text")).toBe(existing);
			expect(previewButton().style.cursor).toBe("");
			expect(document.querySelector('svg[class*="loader"]')).toBeNull();
		} finally {
			log.mockRestore();
		}
	});
});
