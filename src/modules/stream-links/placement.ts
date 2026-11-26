export const insertStreamLinks = (container: HTMLElement, app: HTMLElement) => {
	const previewLink = container.querySelector(".coverart_yt")?.closest("a");
	if (previewLink) {
		previewLink.after(app);
	} else {
		const discogsCover = container.querySelector(
			":scope > .ebr-discogs-cover-placeholder",
		);
		if (discogsCover) discogsCover.after(app);
		else container.prepend(app);
	}
};
