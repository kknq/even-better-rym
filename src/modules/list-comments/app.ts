import { waitForDocumentReady } from "~/shared/utils/dom";

export const main = async (): Promise<void> => {
	await waitForDocumentReady();
	const area = document.querySelector<HTMLElement>(
		"#list_comments_commentarea",
	);
	const scroller = area?.querySelector<HTMLElement>(".smallcomment_area");
	if (!area || !scroller || document.querySelector(".ebr-list-comment-tools")) {
		return;
	}

	const column = area.closest(".columns");
	const overview = column?.parentElement;
	const description = overview?.querySelector(":scope > .large-8.columns");
	if (overview?.classList.contains("row") && description && column) {
		overview.classList.add("ebr-list-overview");
		description.classList.add("ebr-list-description");
		column.classList.add("ebr-list-comments");
	}

	scroller.tabIndex = 0;
	scroller.style.removeProperty("height");
	scroller.setAttribute("role", "region");
	scroller.setAttribute("aria-label", "List comments");

	const tools = document.createElement("div");
	tools.className = "ebr-list-comment-tools";
	for (const [label, bottom] of [
		["Top", false],
		["Bottom", true],
	] as const) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "btn flat_btn btn_small";
		button.textContent = label;
		button.setAttribute(
			"aria-label",
			`Scroll to ${label.toLowerCase()} of comments`,
		);
		button.addEventListener("click", () => {
			const current = document.querySelector<HTMLElement>(
				"#list_comments_commentarea .smallcomment_area",
			);
			if (!current) return;
			current.scrollTop = bottom ? current.scrollHeight : 0;
		});
		tools.append(button);
	}
	const heading = column?.querySelector(":scope > h5");
	if (heading) {
		const header = document.createElement("div");
		header.className = "ebr-list-comment-header";
		header.append(heading, tools);
		area.before(header);
	} else {
		area.before(tools);
	}
	document.documentElement.classList.add("ebr-list-comments-enabled");
};
