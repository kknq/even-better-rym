export function main(): () => void {
	function onKeyDown(event: KeyboardEvent): void {
		if (
			event.key !== "/" ||
			event.defaultPrevented ||
			event.ctrlKey ||
			event.altKey ||
			event.metaKey ||
			event.isComposing ||
			event.repeat
		) {
			return;
		}

		const target = event.target;
		if (
			target instanceof Element &&
			target.closest(
				'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
			)
		) {
			return;
		}

		const search = document.querySelector<HTMLInputElement>(
			"#ui_search_input_main_search",
		);
		if (!search || search.disabled) return;

		event.preventDefault();
		// RYM's native focus handler opens the search panel.
		search.focus();
	}

	document.addEventListener("keydown", onKeyDown);
	return () => document.removeEventListener("keydown", onKeyDown);
}
