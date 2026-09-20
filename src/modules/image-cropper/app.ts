import { runScript, waitForElement } from "~/shared/utils/dom";

type CropDirection = "left" | "right" | "top" | "bottom";

type CropControl = {
	direction: CropDirection;
	adjustment: number;
	label: string;
	anchorIndex: number;
};

const controls: readonly CropControl[] = [
	{ direction: "left", adjustment: 50, label: "-50", anchorIndex: 0 },
	{ direction: "left", adjustment: 10, label: "-10", anchorIndex: 0 },
	{ direction: "left", adjustment: -10, label: "+10", anchorIndex: 1 },
	{ direction: "left", adjustment: -50, label: "+50", anchorIndex: 1 },
	{ direction: "right", adjustment: 50, label: "-50", anchorIndex: 3 },
	{ direction: "right", adjustment: 10, label: "-10", anchorIndex: 3 },
	{ direction: "right", adjustment: -10, label: "+10", anchorIndex: 4 },
	{ direction: "right", adjustment: -50, label: "+50", anchorIndex: 4 },
	{ direction: "top", adjustment: 50, label: "-50", anchorIndex: 6 },
	{ direction: "top", adjustment: 10, label: "-10", anchorIndex: 6 },
	{ direction: "top", adjustment: -10, label: "+10", anchorIndex: 7 },
	{ direction: "top", adjustment: -50, label: "+50", anchorIndex: 7 },
	{ direction: "bottom", adjustment: 50, label: "-50", anchorIndex: 9 },
	{ direction: "bottom", adjustment: 10, label: "-10", anchorIndex: 9 },
	{ direction: "bottom", adjustment: -10, label: "+10", anchorIndex: 10 },
	{ direction: "bottom", adjustment: -50, label: "+50", anchorIndex: 10 },
];

const pageFunctions: Record<CropDirection, string> = {
	left: "trimLeft",
	right: "trimRight",
	top: "trimTop",
	bottom: "trimBottom",
};

export async function main(): Promise<void> {
	const [topBar, bottomBar] = await Promise.all([
		waitForElement<HTMLElement>("#controlbara"),
		waitForElement<HTMLElement>("#controlbarb"),
	]);

	addControls(topBar);
	addControls(bottomBar);
}

function addControls(bar: HTMLElement): void {
	if (bar.dataset.ebrImageCropper === "true") return;

	const inputs = [...bar.querySelectorAll<HTMLInputElement>("input")];
	const anchors = new Map<number, HTMLElement>();

	for (const control of controls) {
		const anchor = inputs[control.anchorIndex];
		if (!anchor) {
			throw new Error(
				`Could not find crop control ${control.anchorIndex} in #${bar.id}`,
			);
		}
		anchors.set(control.anchorIndex, anchor);
	}

	for (const control of controls) {
		const anchor = anchors.get(control.anchorIndex);
		if (!anchor) {
			throw new Error(
				`Could not find crop control ${control.anchorIndex} in #${bar.id}`,
			);
		}

		const button = createControl(control);
		anchor.after(button);
		anchors.set(control.anchorIndex, button);
	}

	bar.dataset.ebrImageCropper = "true";
}

function createControl({
	direction,
	adjustment,
	label,
}: CropControl): HTMLButtonElement {
	const button = document.createElement("button");
	button.type = "button";
	button.textContent = label;
	button.style.margin = "3px";
	button.addEventListener("click", () => {
		void runScript(`${pageFunctions[direction]}(${adjustment})`);
	});

	return button;
}
