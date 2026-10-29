// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { expect, test, vi } from "vitest";

import { PickerPanel, PickerRow, SearchButton } from "./picker-row";

test("reserves the same inline space before, during and after an error", async () => {
	const container = document.createElement("div");
	document.body.append(container);
	let slot: Element | undefined;
	try {
		for (const error of [undefined, "Link this artist first.", undefined]) {
			await act(() => {
				render(
					<PickerPanel title="Artists" hint="Pick an artist">
						<PickerRow
							name="Artist"
							status="Not linked"
							tone="pending"
							active={false}
							error={error}
						>
							<input type="button" value="Find on RYM" />
							<select aria-label="Artist link">
								<option>Artist</option>
							</select>
						</PickerRow>
					</PickerPanel>,
					container,
				);
			});
			const controls =
				container.querySelector("tbody tr")?.lastElementChild
					?.firstElementChild;
			const currentSlot = controls?.lastElementChild;
			expect(controls?.children).toHaveLength(3);
			expect(currentSlot).toBeInstanceOf(HTMLSpanElement);
			if (slot) expect(currentSlot).toBe(slot);
			else slot = currentSlot ?? undefined;
			expect((currentSlot as HTMLElement).style.width).toBe("1em");
			expect((currentSlot as HTMLElement).style.flexShrink).toBe("0");
			expect(
				currentSlot?.querySelector('[role="alert"]')?.getAttribute("title"),
			).toBe(error ?? undefined);
		}
	} finally {
		render(null, container);
		container.remove();
	}
});

test("keeps search, replacement and cancellation buttons the same width", async () => {
	const container = document.createElement("div");
	document.body.append(container);
	const onSearch = vi.fn();
	const onCancel = vi.fn();
	try {
		for (const { active, hasLink, label } of [
			{ active: false, hasLink: false, label: "Find on RYM" },
			{ active: false, hasLink: true, label: "Replace artist link" },
			{ active: true, hasLink: true, label: "Cancel selection" },
		]) {
			await act(() => {
				render(
					<SearchButton
						active={active}
						hasLink={hasLink}
						title="Search for an artist"
						onSearch={onSearch}
						onCancel={onCancel}
					/>,
					container,
				);
			});
			const button = container.querySelector("input");
			expect(button?.value).toBe(label);
			expect(button?.style.width).toBe("12em");
			expect(button?.style.flexShrink).toBe("0");
			button?.click();
		}
		expect(onSearch).toHaveBeenCalledTimes(2);
		expect(onCancel).toHaveBeenCalledOnce();
	} finally {
		render(null, container);
		container.remove();
	}
});
