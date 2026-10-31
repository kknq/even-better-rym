// @vitest-environment jsdom

import { describe, expect, test } from "vitest";

import { insertStreamLinks } from "./placement";

describe("insertStreamLinks", () => {
	test("places stream links below a video preview", () => {
		const container = document.createElement("div");
		container.innerHTML = `
			<a href="https://youtu.be/example"><div class="coverart_yt"></div></a>
			<div id="media_link_button_container_top"></div>
		`;
		const app = document.createElement("div");

		insertStreamLinks(container, app);

		expect(container.children[1]).toBe(app);
	});

	test("prepends stream links when there is no video preview", () => {
		const container = document.createElement("div");
		container.innerHTML = "<div>Existing content</div>";
		const app = document.createElement("div");

		insertStreamLinks(container, app);

		expect(container.firstElementChild).toBe(app);
	});
});
