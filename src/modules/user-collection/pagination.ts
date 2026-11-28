export function alignPagination(row: HTMLElement, navigation?: HTMLElement) {
	const update = () => {
		const controls = row.querySelector<HTMLElement>(
			".ebr-collection-page-size-host",
		);
		const shuffle = row.querySelector<HTMLElement>(
			".ebr-wishlist-shuffle-controls",
		);
		const requiredWidth = navigation
			? navigation.scrollWidth +
				Math.max(controls?.scrollWidth ?? 0, shuffle?.scrollWidth ?? 0) * 2 +
				32
			: (controls?.scrollWidth ?? 0) + (shuffle?.scrollWidth ?? 0) + 16;
		row.classList.toggle(
			"ebr-collection-pagination-stacked",
			requiredWidth > row.clientWidth,
		);
	};
	const observer = new ResizeObserver(update);
	observer.observe(row);
	if (navigation) observer.observe(navigation);
	const observeControls = () => {
		for (const element of row.querySelectorAll<HTMLElement>(
			".ebr-collection-page-size-host, .ebr-wishlist-shuffle-controls",
		)) {
			observer.observe(element);
		}
		update();
	};
	new MutationObserver(observeControls).observe(row, {
		childList: true,
		subtree: true,
	});
	observeControls();
}
