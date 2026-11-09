const dialog = document.querySelector(".preview-dialog");
const preview = document.querySelector(".preview-image");
const closeButton = document.querySelector(".preview-close");

if (
	!(dialog instanceof HTMLDialogElement) ||
	!(preview instanceof HTMLImageElement) ||
	!(closeButton instanceof HTMLButtonElement)
) {
	throw new Error("Changelog image preview controls are missing.");
}

for (const image of document.querySelectorAll(".change-preview")) {
	const link = image.closest("a");
	if (!(image instanceof HTMLImageElement) || !link) continue;
	link.setAttribute("aria-haspopup", "dialog");
	link.addEventListener("click", (event) => {
		event.preventDefault();
		preview.src = image.src;
		preview.alt = image.alt;
		dialog.showModal();
	});
}

closeButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
	if (event.target !== dialog) return;
	const bounds = dialog.getBoundingClientRect();
	if (
		event.clientX < bounds.left ||
		event.clientX > bounds.right ||
		event.clientY < bounds.top ||
		event.clientY > bounds.bottom
	) {
		dialog.close();
	}
});
