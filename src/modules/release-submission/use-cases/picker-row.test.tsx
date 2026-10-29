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
			expect((currentSlot as HTMLElement).style.width).toBe("24px");
			expect((currentSlot as HTMLElement).style.height).toBe("24px");
			expect((currentSlot as HTMLElement).style.flexShrink).toBe("0");
			expect(
				currentSlot?.querySelector("button")?.getAttribute("aria-label"),
			).toBe(error ?? undefined);
			expect((currentSlot as HTMLElement).style.cursor).toBe(
				error ? "help" : "",
			);
			expect(currentSlot?.querySelector("button")?.tabIndex).toBe(
				error ? 0 : undefined,
			);
			expect(currentSlot?.querySelector("svg")?.getAttribute("width")).toBe(
				error ? "24" : undefined,
			);
		}
	} finally {
		render(null, container);
		container.remove();
	}
});

test.each([
	"hover",
	"focus",
])("shows the error outside the scrolling panel on %s and removes it when resolved", async (interaction) => {
	const container = document.createElement("div");
	document.body.append(container);
	const renderRow = (error?: string) =>
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
				</PickerRow>
			</PickerPanel>,
			container,
		);
	try {
		await act(() => renderRow("Link this artist first."));
		const indicator = container.querySelector<HTMLElement>(
			'[role="alert"] button',
		);
		if (!indicator) throw new Error("Missing error indicator");
		vi.spyOn(indicator, "getBoundingClientRect").mockReturnValue(
			new DOMRect(100, 100, 24, 24),
		);
		const enter = () => {
			if (interaction === "hover")
				indicator.dispatchEvent(new MouseEvent("mouseenter"));
			else indicator.focus();
		};
		const leave = () => {
			if (interaction === "hover")
				indicator.dispatchEvent(new MouseEvent("mouseleave"));
			else indicator.blur();
		};
		expect(document.querySelector('[role="tooltip"]')).toBeNull();
		await act(enter);
		const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]');
		expect(tooltip?.textContent).toBe("Link this artist first.");
		expect(tooltip?.parentElement).toBe(document.body);
		expect(tooltip?.style.position).toBe("fixed");
		expect(tooltip?.style.left).toBe("100px");
		expect(indicator.getAttribute("aria-describedby")).toBe(tooltip?.id);
		await act(() => {
			indicator.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});
		expect(document.querySelector('[role="tooltip"]')).toBeNull();
		await act(leave);
		expect(document.querySelector('[role="tooltip"]')).toBeNull();
		await act(enter);
		expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
		await act(() => renderRow());
		expect(document.querySelector('[role="tooltip"]')).toBeNull();
		expect(container.querySelector('[role="alert"]')).toBeNull();
		await act(() => renderRow("Another error."));
		expect(document.querySelector('[role="tooltip"]')).toBeNull();
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
