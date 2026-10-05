export function alignPagination(
	row: HTMLElement,
	navigation: HTMLElement,
	controls: HTMLElement,
) {
	const update = () => {
		const requiredWidth =
			navigation.scrollWidth + controls.scrollWidth * 2 + 32;
		row.classList.toggle(
			"ebr-collection-pagination-stacked",
			requiredWidth > row.clientWidth,
		);
	};
	const observer = new ResizeObserver(update);
	observer.observe(row);
	observer.observe(navigation);
	observer.observe(controls);
	update();
}
