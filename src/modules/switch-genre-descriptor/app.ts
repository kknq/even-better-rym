import { waitForDocumentReady } from "~/shared/utils/dom";

type SwitchLinkConfig = {
	headingText: string;
	linkText: string;
	sourcePath: string;
	targetPath: string;
};

const GENRE_SWITCH_LINK: SwitchLinkConfig = {
	headingText: "Primary Genres",
	linkText: "Switch to Descriptors",
	sourcePath: "/rgenre/",
	targetPath: "/rdescriptor/",
};

const DESCRIPTOR_SWITCH_LINK: SwitchLinkConfig = {
	headingText: "Descriptors",
	linkText: "Switch to Genres",
	sourcePath: "/rdescriptor/",
	targetPath: "/rgenre/",
};

function getSwitchLinkConfig(url: string): SwitchLinkConfig | null {
	if (url.includes(GENRE_SWITCH_LINK.sourcePath)) return GENRE_SWITCH_LINK;
	if (url.includes(DESCRIPTOR_SWITCH_LINK.sourcePath))
		return DESCRIPTOR_SWITCH_LINK;

	return null;
}

function appendSwitchLink(url: string, config: SwitchLinkConfig): void {
	const heading = [...document.querySelectorAll("h3")].find(
		(h3) =>
			h3.textContent?.includes(config.headingText) && !h3.querySelector("a"),
	);
	if (!heading) return;

	const link = document.createElement("a");
	link.textContent = config.linkText;
	link.href = url.replace(config.sourcePath, config.targetPath);
	link.style.marginLeft = "10px";
	link.style.fontSize = "0.8em";
	link.style.color = "rgb(102, 102, 102)";
	link.style.cursor = "pointer";
	heading.appendChild(link);
}

export async function main(): Promise<void> {
	await waitForDocumentReady();

	const url = globalThis.location.href;
	const config = getSwitchLinkConfig(url);

	if (!config || !/album_id=(\d+)/.test(url)) return;

	appendSwitchLink(url, config);
}
