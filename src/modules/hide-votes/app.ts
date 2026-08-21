import { waitForDocumentReady } from "~/shared/utils/dom";

const STYLE = `
	.ebr-hide-votes-button {
		margin-left: 8px;
		cursor: pointer;
		font-size: 0.8em;
		color: #666;
		user-select: none;
}
	.ebr-hide-votes-button:hover {
		color: #333;
	}
	.ebr-votes-hidden .ebr-user-list {
		display: none !important;
	}
`;

const VOTE_HEADER_PATTERN = /(<b>voted (?:for|against):<\/b>.*?:)/i;

function extractVoteCount(html: string): number {
	// Match the number after "voted for:" or "voted against:" and before the parenthesis
	// For descriptor pages: "(321 / <span..." or "(7):"
	// For genre pages: "(22) :"
	const match = /<b>voted (?:for|against):<\/b>\s*\((\d+)/.exec(html);
	return match ? Number.parseInt(match[1], 10) : 0;
}

function addHideButton(
	spanElement: HTMLElement,
	voteForCount: number,
	voteAgainstCount: number,
): void {
	if (spanElement.querySelector(".ebr-hide-votes-button")) return;

	const html = spanElement.innerHTML;
	const match = VOTE_HEADER_PATTERN.exec(html);

	let before: string;
	let userListHtml: string;

	if (match?.index !== undefined) {
		// Standard case: has vote header like "voted for: (XXX) :"
		const insertPosition = match.index + match[0].length;
		before = html.substring(0, insertPosition);
		userListHtml = html.substring(insertPosition);
	} else {
		// Genre page case: empty <b> tag, insert at beginning
		before = "";
		userListHtml = html;
	}

	// Calculate percentage
	const totalVotes = voteForCount + voteAgainstCount;
	const isVoteFor = html.includes("voted for:");
	const currentCount = isVoteFor ? voteForCount : voteAgainstCount;
	const percentage =
		totalVotes > 0 ? ((currentCount / totalVotes) * 100).toFixed(1) : "0.0";

	// Insert percentage after the vote count in the header
	// For descriptor pages with score section, append percentage after the colon
	// For genre pages without score section, replace the vote count with percentage
	const hasScoreSection = html.includes('title="unweighted degree average"');
	let updatedBefore: string;

	if (hasScoreSection) {
		// Descriptor page: append percentage after the colon
		updatedBefore = before + ` ${currentCount}/${totalVotes}, ${percentage}%`;
	} else {
		// Genre page: replace the vote count with percentage
		updatedBefore = before.replace(
			/\((\d+)\)/,
			`($1/${totalVotes}, ${percentage}%)`,
		);
	}

	spanElement.innerHTML =
		updatedBefore +
		`<span class="ebr-hide-votes-button">Hide</span>` +
		`<span class="ebr-user-list">${userListHtml}</span>`;

	const button = spanElement.querySelector<HTMLElement>(
		".ebr-hide-votes-button",
	);

	if (button === null) {
		return;
	}

	button.addEventListener("click", () => {
		spanElement.classList.toggle("ebr-votes-hidden");
		if (spanElement.classList.contains("ebr-votes-hidden")) {
			button.textContent = "Show";
		} else {
			button.textContent = "Hide";
		}
	});
}

function collectVoteSpans(
	spans: NodeListOf<Element>,
): Map<HTMLElement, HTMLElement[]> {
	// Group spans by their container (genrea or descriptora)
	const containerMap = new Map<HTMLElement, HTMLElement[]>();

	for (const span of spans) {
		const bold = span.querySelector("b");
		if (!bold) continue;

		const text = bold.textContent?.trim().toLowerCase();
		const hasUserLinks = span.querySelector("a.user");

		// Only process spans with vote text or user links
		if (
			text &&
			(text.startsWith("voted for:") || text.startsWith("voted against:"))
		) {
			const container = span.closest(
				".genrea, .genred, .descriptora, .descriptord",
			) as HTMLElement;
			if (container) {
				if (!containerMap.has(container)) {
					containerMap.set(container, []);
				}
				containerMap.get(container)!.push(span as HTMLElement);
			}
		} else if (!text && hasUserLinks) {
			// Genre page case with empty <b> tag
			const container = span.closest(".genrea") as HTMLElement;
			if (container) {
				if (!containerMap.has(container)) {
					containerMap.set(container, []);
				}
				containerMap.get(container)!.push(span as HTMLElement);
			}
		}
	}

	return containerMap;
}

function getVoteCounts(containerSpans: HTMLElement[]) {
	let voteForCount = 0;
	let voteAgainstCount = 0;

	for (const span of containerSpans) {
		const html = span.innerHTML;
		const count = extractVoteCount(html);

		if (html.includes("voted for:")) {
			voteForCount = count;
		} else if (html.includes("voted against:")) {
			voteAgainstCount = count;
		}
	}

	return { voteForCount, voteAgainstCount };
}

function processVoteSpans(): void {
	const spans = document.querySelectorAll("span.small");

	const containerMap = collectVoteSpans(spans);

	for (const [, containerSpans] of containerMap) {
		const { voteForCount, voteAgainstCount } = getVoteCounts(containerSpans);

		for (const span of containerSpans) {
			addHideButton(span, voteForCount, voteAgainstCount);
		}
	}
}

function addSwitchLink(): void {
	const url = globalThis.location.href;
	const isGenrePage = url.includes("/rgenre/");
	const isDescriptorPage = url.includes("/rdescriptor/");

	if (!isGenrePage && !isDescriptorPage) return;

	// Extract album_id from URL
	const albumIdMatch = /album_id=(\d+)/.exec(url);
	if (!albumIdMatch) return;

	if (isGenrePage) {
		// Find "Primary Genres" h3 and add "Switch to Descriptor" link
		const h3s = document.querySelectorAll("h3");
		for (const h3 of h3s) {
			if (
				h3.textContent?.includes("Primary Genres") &&
				!h3.querySelector("a")
			) {
				const link = document.createElement("a");
				link.textContent = "Switch to Descriptors";
				link.href = url.replace("/rgenre/", "/rdescriptor/");
				link.style.marginLeft = "10px";
				link.style.fontSize = "0.8em";
				link.style.color = "rgb(102, 102, 102)";
				link.style.cursor = "pointer";
				h3.appendChild(link);
				break;
			}
		}
	} else if (isDescriptorPage) {
		// Find "Descriptors" h3 and add "Switch to Genres" link
		const h3s = document.querySelectorAll("h3");
		for (const h3 of h3s) {
			if (h3.textContent?.includes("Descriptors") && !h3.querySelector("a")) {
				const link = document.createElement("a");
				link.textContent = "Switch to Genres";
				link.href = url.replace("/rdescriptor/", "/rgenre/");
				link.style.marginLeft = "10px";
				link.style.fontSize = "0.8em";
				link.style.color = "rgb(102, 102, 102)";
				link.style.cursor = "pointer";
				h3.appendChild(link);
				break;
			}
		}
	}
}

function addCollapseAllButton(): void {
	const url = globalThis.location.href;
	const isGenrePage = url.includes("/rgenre/");
	const isDescriptorPage = url.includes("/rdescriptor/");

	if (!isGenrePage && !isDescriptorPage) return;

	// Find the form element - different selectors for genre and descriptor pages
	let form: HTMLElement | null;
	if (isGenrePage) {
		form = document.querySelector(".votingbox form");
	} else {
		// Descriptor page: find form with prigen input
		form = document
			.querySelector("form input#prigen")
			?.closest("form") as HTMLElement | null;
	}

	if (!form) return;

	const collapseButton = document.createElement("input");
	collapseButton.type = "button";
	collapseButton.value = "Collapse All";
	collapseButton.style.marginLeft = "0.5em";

	let allCollapsed = false;
	collapseButton.addEventListener("click", () => {
		const buttons = document.querySelectorAll(".ebr-hide-votes-button");
		allCollapsed = !allCollapsed;

		buttons.forEach((button) => {
			const span = button.closest("span.small") as HTMLElement;
			if (span) {
				if (allCollapsed) {
					span.classList.add("ebr-votes-hidden");
					(button as HTMLElement).textContent = "Show";
				} else {
					span.classList.remove("ebr-votes-hidden");
					(button as HTMLElement).textContent = "Hide";
				}
			}
		});

		collapseButton.value = allCollapsed ? "Expand All" : "Collapse All";
	});

	form.appendChild(collapseButton);
}

export async function main(): Promise<void> {
	await waitForDocumentReady();

	const style = document.createElement("style");
	style.textContent = STYLE;
	document.head.appendChild(style);

	const url = globalThis.location.href;
	const isGenrePage = url.includes("/rgenre/");
	const isDescriptorPage = url.includes("/rdescriptor/");

	if (!isGenrePage && !isDescriptorPage) return;

	// Add switch link and collapse button immediately (don't depend on content loading)
	addSwitchLink();
	addCollapseAllButton();

	// Wait for loading image to have "blank" in src before processing vote spans
	const waitForLoadingComplete = (): Promise<void> => {
		return new Promise((resolve) => {
			const loadingImg = document.getElementById(
				"loading",
			) as HTMLImageElement | null;

			if (loadingImg === null) {
				resolve();
				return;
			}

			const isLoaded = () => loadingImg.src.includes("/images/blank.png");

			if (isLoaded()) {
				resolve();
				return;
			}

			const observer = new MutationObserver(() => {
				if (!isLoaded()) {
					return;
				}

				observer.disconnect();
				resolve();
			});

			observer.observe(loadingImg, {
				attributes: true,
				attributeFilter: ["src"],
			});
		});
	};

	// Wait for loading to complete, then process vote spans
	await waitForLoadingComplete();
	processVoteSpans();

	// Set up MutationObserver to handle dynamic content changes
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "childList") {
				// Check if new genrea, genred, descriptora, or descriptord elements were added
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as Element;
						if (
							element.classList?.contains("genrea") ||
							element.classList?.contains("genred") ||
							element.classList?.contains("descriptora") ||
							element.classList?.contains("descriptord") ||
							element.querySelector?.(
								".genrea, .genred, .descriptora, .descriptord",
							)
						) {
							// Re-process vote spans when new content is added
							// TODO: add a mechanism to trigger that based on the page changes instead of being time-based.
							setTimeout(() => {
								processVoteSpans();
							}, 500);
							break;
						}
					}
				}
			}
		}
	});

	// Start observing the document body for changes
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}
