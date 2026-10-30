export const appendAlbumIdControl = (
	titleElement: HTMLElement,
	color: string,
): void => {
	const container = document.querySelector<HTMLDivElement>(
		".ebr-reference-links",
	);
	const albumShortcut = titleElement.querySelector<HTMLElement>(
		":scope > .album_shortcut",
	);
	const albumId =
		albumShortcut instanceof HTMLInputElement
			? albumShortcut.value.trim()
			: albumShortcut?.textContent?.trim();
	if (!container || !albumShortcut || !albumId) return;
	if (container.querySelector(".ebr-album-id-copy")) return;

	albumShortcut.hidden = true;
	const copyButton = document.createElement("button");
	copyButton.type = "button";
	copyButton.className = "ebr-album-id-copy";
	copyButton.textContent = "?";
	copyButton.dataset.albumId = albumId;
	copyButton.setAttribute("aria-label", `Copy ${albumId}`);
	copyButton.setAttribute("aria-live", "polite");
	copyButton.style.setProperty("--ebr-reference-button-color", color);
	let feedbackTimeout: number | undefined;
	const showCopyFeedback = (message: string) => {
		copyButton.dataset.albumId = message;
		copyButton.setAttribute("aria-label", message);
		copyButton.classList.add("ebr-album-id-copy-feedback");
		if (feedbackTimeout !== undefined) {
			window.clearTimeout(feedbackTimeout);
		}
		feedbackTimeout = window.setTimeout(() => {
			copyButton.dataset.albumId = albumId;
			copyButton.setAttribute("aria-label", `Copy ${albumId}`);
			copyButton.classList.remove("ebr-album-id-copy-feedback");
			feedbackTimeout = undefined;
		}, 2200);
	};
	const copyAlbumId = async () => {
		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error("Clipboard API is unavailable");
			}
			await navigator.clipboard.writeText(albumId);
			showCopyFeedback("ID copied to clipboard!");
		} catch {
			showCopyFeedback("Unable to copy the Album ID");
		}
	};
	copyButton.addEventListener("click", () => void copyAlbumId());
	container.append(copyButton);
	const referenceLink = container.querySelector<HTMLElement>(
		".ebr-reference-link",
	);
	const referenceLinkHeight = referenceLink?.getBoundingClientRect().height;
	if (referenceLinkHeight && Number.isFinite(referenceLinkHeight)) {
		copyButton.style.setProperty(
			"--ebr-album-id-control-size",
			`${referenceLinkHeight}px`,
		);
	}
};

export const reduceTitleTopSpacing = (titleElement: HTMLElement): void => {
	const section = titleElement.closest<HTMLElement>(
		".section_main_info.section_outer",
	);
	if (!section || section.classList.contains("ebr-reference-title-spacing")) {
		return;
	}

	const halveTopPadding = () => {
		section.classList.remove("ebr-reference-title-spacing");
		const topPadding = Number.parseFloat(
			window.getComputedStyle(section).paddingTop,
		);
		if (!Number.isFinite(topPadding)) return;

		section.style.setProperty(
			"--ebr-reference-title-padding-top",
			`${topPadding / 2}px`,
		);
		section.classList.add("ebr-reference-title-spacing");
	};

	halveTopPadding();
	window.addEventListener("resize", halveTopPadding);
};
