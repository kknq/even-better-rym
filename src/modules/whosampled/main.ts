import { runPage } from "~/shared/page-settings";
import { findReleaseIssue } from "~/shared/release-data";
import { getReleaseTitleData } from "~/shared/release-title";
import { waitForElement } from "~/shared/utils/dom";

import "./whosampled.css";

const toSlug = (value: string): string =>
	value
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-By-.*/i, "");

async function main(): Promise<void> {
	await waitForElement<HTMLAnchorElement>('a[href*="/submit_media_link"]');
	const submitLinks = Array.from(
		document.querySelectorAll<HTMLAnchorElement>(
			'a[href*="/submit_media_link"]',
		),
	);
	const submitLink =
		submitLinks.find((link) => !link.closest(".show-for-small")) ??
		submitLinks.at(-1);
	const release = getReleaseTitleData();
	if (!submitLink?.parentElement || !release || !findReleaseIssue()) return;

	const container = document.createElement("div");
	container.className = "ebr-whosampled-button-container";
	const link = document.createElement("a");
	link.className = "ebr-whosampled-button";
	link.href = `https://www.whosampled.com/album/${toSlug(release.artistName)}/${toSlug(release.albumTitle)}/`;
	link.target = "_blank";
	link.rel = "noreferrer";
	link.textContent = "View on WhoSampled";
	container.append(link);
	submitLink.parentElement.after(container);
}

void runPage("whosampled", main);
