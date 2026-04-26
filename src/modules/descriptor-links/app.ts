import { waitForElement } from "~/shared/utils/dom";

const BASE_URL = "https://rateyourmusic.com/charts/top/album/all-time/d:";

const STYLE = `
  .ebr-descriptor-link {
    font-size: .9em;
    line-height: 1.4;
    text-decoration: underline var(--mono-b);
    color: var(--mono-6);
  }
  .ebr-descriptor-wrapper + .ebr-descriptor-wrapper::before {
    content: ', ';
    color: var(--mono-6);
  }
`;

export async function main() {
	const row = await waitForElement<HTMLTableRowElement>(
		"tr.release_descriptors",
	);

	row
		.querySelector<HTMLSpanElement>("span.release_pri_descriptors")
		?.style.setProperty("display", "none");

	const style = document.createElement("style");
	style.textContent = STYLE;
	document.head.appendChild(style);

	row.querySelectorAll<HTMLMetaElement>("meta").forEach((meta) => {
		const content = meta.getAttribute("content");
		if (!content) return;

		const slug = content.trim().replaceAll(/\s+/g, "-");

		const link = document.createElement("a");
		link.href = `${BASE_URL}${slug}`;
		link.textContent = content;
		link.className = "ebr-descriptor-link";

		const wrapper = document.createElement("span");
		wrapper.className = "ebr-descriptor-wrapper";
		wrapper.appendChild(link);

		meta.replaceWith(wrapper);
	});
}
