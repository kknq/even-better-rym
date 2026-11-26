export const moveAlbumId = (titleElement: HTMLElement): void => {
	const albumShortcut = titleElement.querySelector<HTMLInputElement>(
		":scope > .album_shortcut",
	);
	const sidebarCell =
		titleElement.parentElement?.querySelector<HTMLTableElement>(
			":scope > .album_info_outer",
		)?.rows[0]?.cells[1];
	const stickyAd = sidebarCell?.querySelector<HTMLElement>(":scope > div");
	if (!albumShortcut) return;
	const albumId = albumShortcut.value.trim();
	if (!albumId) return;

	const container = document.createElement("div");
	container.className = "ebr-album-id-container";
	const originalFontSize = window.getComputedStyle(albumShortcut).fontSize;
	albumShortcut.style.fontSize = originalFontSize;
	albumShortcut.hidden = false;
	container.append(albumShortcut);
	if (sidebarCell && stickyAd?.style.position === "sticky") {
		sidebarCell.classList.add("ebr-album-id-sidebar");
		stickyAd.classList.add("ebr-album-id-sticky-ad");
		stickyAd.before(container);
	} else {
		container.classList.add("ebr-album-id-inline");
		const colorBar = titleElement.parentElement?.querySelector(
			":scope > .color_bar",
		);
		(colorBar ?? titleElement).after(container);
	}
};

export const enableAlbumIdCopy = (titleElement: HTMLElement): void => {
	const albumShortcut =
		titleElement.querySelector<HTMLInputElement>(".album_shortcut") ??
		document.querySelector<HTMLInputElement>(
			".ebr-album-id-container > .album_shortcut",
		);
	if (
		!albumShortcut ||
		albumShortcut.classList.contains("ebr-album-id-click-to-copy")
	)
		return;
	const albumId = albumShortcut.value.trim();
	if (!albumId) return;
	const container = albumShortcut.parentElement;
	if (!container) return;
	albumShortcut.classList.add("ebr-album-id-click-to-copy");
	albumShortcut.removeAttribute("onclick");
	albumShortcut.onclick = null;
	albumShortcut.setAttribute("aria-label", `Copy ${albumId} to clipboard`);
	albumShortcut.title = "Click to copy Album ID";
	const feedback = document.createElement("span");
	feedback.className = "ebr-album-id-feedback";
	feedback.setAttribute("role", "status");
	feedback.setAttribute("aria-live", "polite");
	document.body.append(feedback);
	let feedbackTimeout: number | undefined;
	const showCopyFeedback = (message: string) => {
		feedback.textContent = message;
		const labelBounds = albumShortcut.getBoundingClientRect();
		const hintBounds = feedback.getBoundingClientRect();
		feedback.style.left = `${Math.max(
			8,
			Math.min(
				labelBounds.right - hintBounds.width,
				window.innerWidth - hintBounds.width - 8,
			),
		)}px`;
		feedback.style.top = `${Math.max(
			8,
			labelBounds.bottom + hintBounds.height + 8 <= window.innerHeight
				? labelBounds.bottom + 8
				: labelBounds.top - hintBounds.height - 8,
		)}px`;
		if (feedbackTimeout !== undefined) {
			window.clearTimeout(feedbackTimeout);
		}
		feedbackTimeout = window.setTimeout(() => {
			feedback.textContent = "";
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
	albumShortcut.addEventListener("mousedown", (event) => {
		if (event.button === 0) event.preventDefault();
	});
	albumShortcut.addEventListener(
		"click",
		(event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
			albumShortcut.setSelectionRange(0, 0);
			void copyAlbumId();
		},
		{ capture: true },
	);
	albumShortcut.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		void copyAlbumId();
	});
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
