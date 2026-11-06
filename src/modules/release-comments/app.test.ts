// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./app";

vi.mock("~/shared/utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(),
}));

const getList = () => {
	const list = document.querySelector<HTMLElement>(".comments_list");
	if (!list) throw new Error("Missing comment list");
	return list;
};

const getButton = () => {
	const button = document.querySelector<HTMLButtonElement>(
		".ebr-load-all-comments",
	);
	if (!button) throw new Error("Missing load-all button");
	return button;
};

const getLoader = () => {
	const loader = getList().querySelector<HTMLElement>(".comments_load");
	if (!loader) throw new Error("Missing native loader");
	return loader;
};

beforeEach(() => {
	vi.useFakeTimers();
	// Matches the Comments section and offset loader in the saved release page.
	document.body.innerHTML = `
		<div class="section_comments">
			<div class="release_page_header"><h2>Comments</h2></div>
			<div class="comments view" id="comments_l_c_28550">
				<ul class="comments_list" id="comments_list_l_c_28550">
					<li id="comments_load_offset_10" class="comments_load">Load more comments [30]</li>
					<li class="comment" id="comment_1">Newest comment</li>
				</ul>
				<div class="comments_post"><textarea class="comment_new"></textarea></div>
			</div>
		</div>`;
	getLoader().setAttribute("onclick", "/* original RYM handler */");
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

function installResponse(all: boolean) {
	const loader = getLoader();
	return vi.spyOn(loader, "click").mockImplementation(() => {
		loader.classList.add("loading");
		setTimeout(() => {
			const comment = document.createElement("li");
			comment.className = "comment";
			comment.textContent = "Older comment";
			loader.after(comment);
			loader.remove();
			if (!all) {
				const next = document.createElement("li");
				next.className = "comments_load";
				next.id = "comments_load_offset_20";
				next.setAttribute("onclick", "/* original RYM handler */");
				getList().prepend(next);
			}
		}, 20);
	});
}

describe("paced release comments", () => {
	it("adds one compact, aligned button without loading automatically", async () => {
		const click = vi.spyOn(getLoader(), "click");
		await main();
		await main();
		expect(document.querySelectorAll(".ebr-load-all-comments")).toHaveLength(1);
		expect(getButton().type).toBe("button");
		expect(
			getButton().parentElement?.classList.contains("ebr-comments-header"),
		).toBe(true);
		expect(getButton().title).toContain("750-850 ms");
		expect(click).not.toHaveBeenCalled();
		const style = document.createElement("style");
		style.textContent = readFileSync(
			"src/modules/release-comments/release-comments.css",
			"utf8",
		);
		document.head.append(style);
		const header = getButton().parentElement;
		if (!header) throw new Error("Missing header");
		expect(getComputedStyle(header).display).toBe("flex");
		expect(getComputedStyle(header).alignItems).toBe("center");
		expect(getComputedStyle(header).height).toBe("auto");
		expect(getComputedStyle(header).flexWrap).toBe("wrap");
		style.remove();
	});

	it("uses the original native handler without guessed parameters", async () => {
		const loader = getLoader();
		const originalHandler = loader.getAttribute("onclick");
		let handler = "";
		const click = installResponse(true);
		const response = click.getMockImplementation();
		click.mockImplementation(() => {
			handler = loader.getAttribute("onclick") ?? "";
			response?.();
		});
		await main();
		getButton().click();
		expect(handler).toBe(originalHandler);
		expect(loader.getAttribute("onclick")).toBe(originalHandler);
		expect(getButton().disabled).toBe(false);
		expect(getButton().textContent).toBe("Stop loading");
		expect(getList().getAttribute("aria-busy")).toBe("true");
		await vi.advanceTimersByTimeAsync(1000);
		expect(click).toHaveBeenCalledTimes(1);
		expect(getButton().textContent).toBe("All comments loaded");
		expect(document.querySelector("[role=status]")?.textContent).toBe(
			"2 comments",
		);
		expect(getList().lastElementChild?.id).toBe("comment_1");
		expect(document.querySelector("textarea")).not.toBeNull();
		expect(getList().hasAttribute("aria-busy")).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it.each([
		[0, 750],
		[0.5, 800],
		[0.999999, 850],
	])("uses random value %s to pause %s ms after a response", async (random, delay) => {
		vi.spyOn(Math, "random").mockReturnValue(random);
		const click = installResponse(false);
		await main();
		getButton().click();
		await vi.advanceTimersByTimeAsync(20);
		const nextClick = installResponse(true);
		await vi.advanceTimersByTimeAsync(delay - 1);
		expect(nextClick).not.toHaveBeenCalled();
		expect(click).toHaveBeenCalledTimes(1);
		expect(getButton().disabled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(nextClick).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(20);
		expect(getButton().textContent).toBe("All comments loaded");
		expect(getButton().disabled).toBe(true);
		expect(document.querySelector("[role=status]")?.textContent).toContain(
			"3 comments",
		);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("does not send a request if the native loader is busy or unrecognized", async () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		const click = vi.spyOn(getLoader(), "click");
		getLoader().classList.add("loading");
		await main();
		getButton().click();
		expect(click).not.toHaveBeenCalled();
		expect(document.querySelector("[role=status]")?.textContent).toContain(
			"already loading",
		);
		getLoader().classList.remove("loading");
		getLoader().id = "unknown";
		getButton().click();
		expect(click).not.toHaveBeenCalled();
		expect(document.querySelector("[role=status]")?.textContent).toContain(
			"Could not recognize",
		);
		expect(getButton().disabled).toBe(false);
	});

	it("reports timeouts without retrying and restores manual loading", async () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const loader = getLoader();
		const originalHandler = loader.getAttribute("onclick");
		const click = vi.spyOn(loader, "click").mockImplementation(() => {
			loader.classList.add("loading");
			loader.textContent = "Loading...";
		});
		await main();
		getButton().click();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(click).toHaveBeenCalledTimes(1);
		expect(document.querySelector("[role=status]")?.textContent).toContain(
			"RYM did not finish loading",
		);
		expect(log).toHaveBeenCalledTimes(1);
		expect(loader.classList.contains("loading")).toBe(false);
		expect(loader.textContent).toBe("Load more comments [30]");
		expect(loader.getAttribute("onclick")).toBe(originalHandler);
		expect(getButton().disabled).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("stops immediately during the pause and can resume from the next batch", async () => {
		installResponse(false);
		await main();
		getButton().click();
		await vi.advanceTimersByTimeAsync(20);
		const nextClick = installResponse(true);
		getButton().click();
		await vi.advanceTimersByTimeAsync(0);
		expect(nextClick).not.toHaveBeenCalled();
		expect(getButton().textContent).toBe("Load all comments");
		expect(getButton().disabled).toBe(false);
		expect(document.querySelector("[role=status]")?.textContent).toContain(
			"Stopped.",
		);
		expect(getList().hasAttribute("aria-busy")).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
		getButton().click();
		await vi.advanceTimersByTimeAsync(20);
		expect(nextClick).toHaveBeenCalledTimes(1);
		expect(getButton().textContent).toBe("All comments loaded");
	});

	it("allows an in-flight request to finish without sending another request after stopping", async () => {
		const click = installResponse(false);
		await main();
		getButton().click();
		getButton().click();
		expect(getButton().textContent).toBe("Stopping...");
		expect(getButton().disabled).toBe(true);
		expect(getLoader().classList.contains("loading")).toBe(true);
		await vi.advanceTimersByTimeAsync(20);
		const nextClick = vi.spyOn(getLoader(), "click");
		await vi.advanceTimersByTimeAsync(60_000);
		expect(click).toHaveBeenCalledTimes(1);
		expect(nextClick).not.toHaveBeenCalled();
		expect(getButton().textContent).toBe("Load all comments");
		expect(getButton().disabled).toBe(false);
		expect(document.querySelector("[role=status]")?.textContent).toBe(
			"Stopped. 2 comments loaded.",
		);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("does not add controls when all comments are loaded or the section is absent", async () => {
		getLoader().remove();
		await main();
		expect(document.querySelector("button")).toBeNull();
		document.body.innerHTML = "";
		await main();
		expect(document.querySelector("button")).toBeNull();
	});
});
