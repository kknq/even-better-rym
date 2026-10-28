// @vitest-environment jsdom

import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { isMacPlatform } from "~/shared/chart-shortcuts/binding";
import { ShortcutRecorder } from "./shortcut-recorder";

let container: HTMLDivElement;
const onCapture = vi.fn<(combo: string) => string | null>();

beforeEach(() => {
	onCapture.mockReset().mockReturnValue(null);
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(async () => {
	await act(() => render(null, container));
	container.remove();
});

async function showRecorder() {
	await act(() =>
		render(<ShortcutRecorder onCapture={onCapture} />, container),
	);
}

async function beginRecording() {
	await act(() => container.querySelector("button")!.click());
	return container.querySelector("input")!;
}

async function pressKey(input: HTMLInputElement, init: KeyboardEventInit) {
	const event = new KeyboardEvent("keydown", {
		bubbles: true,
		cancelable: true,
		...init,
	});
	await act(() => {
		input.dispatchEvent(event);
	});
	return event;
}

describe("ShortcutRecorder", () => {
	test("starts with an add button and focuses the read-only recorder on click", async () => {
		await showRecorder();

		expect(container.querySelector("button")?.textContent).toBe("+");
		expect(container.querySelector("input")).toBeNull();

		const input = await beginRecording();

		expect(input.value).toBe("Press keys… (Esc to cancel)");
		expect(input.readOnly).toBe(true);
		expect(document.activeElement).toBe(input);
		expect(container.querySelector("button")).toBeNull();
		expect(onCapture).not.toHaveBeenCalled();
	});

	test.each([
		"Escape",
		"blur",
	])("cancels recording on %s without capturing", async (cancel) => {
		await showRecorder();
		const input = await beginRecording();

		if (cancel === "Escape") {
			await pressKey(input, { key: "Escape", code: "Escape", ctrlKey: true });
		} else {
			await act(() => input.blur());
		}

		expect(container.querySelector("input")).toBeNull();
		expect(container.querySelector("button")?.textContent).toBe("+");
		expect(onCapture).not.toHaveBeenCalled();
	});

	test.each([
		"ControlLeft",
		"ControlRight",
		"AltLeft",
		"AltRight",
		"ShiftLeft",
		"ShiftRight",
		"MetaLeft",
		"MetaRight",
	])("ignores modifier-only %s while continuing to record", async (code) => {
		await showRecorder();
		const input = await beginRecording();

		await pressKey(input, { code, ctrlKey: true });

		expect(onCapture).not.toHaveBeenCalled();
		expect(container.querySelector("input")).toBe(input);
		expect(container.textContent).toBe("");
	});

	test.each([
		false,
		true,
	])("rejects a key without Ctrl/Alt/Command (shift=%s)", async (shiftKey) => {
		await showRecorder();
		const input = await beginRecording();

		await pressKey(input, { key: "a", code: "KeyA", shiftKey });

		expect(container.textContent).toBe(
			`Shortcuts need ${isMacPlatform ? "Control" : "Ctrl"}, ${isMacPlatform ? "Option" : "Alt"}, or Command`,
		);
		expect(container.querySelector("input")).toBe(input);
		expect(onCapture).not.toHaveBeenCalled();
	});

	test.each([
		[
			{ key: "!", code: "Digit1", ctrlKey: true, shiftKey: true },
			"ctrl+shift+Digit1",
		],
		[{ key: "a", code: "KeyA", altKey: true }, "alt+KeyA"],
		[{ key: "Enter", code: "NumpadEnter", metaKey: true }, "meta+NumpadEnter"],
	])("captures physical key codes and modifiers: %s", async (init, combo) => {
		await showRecorder();
		const input = await beginRecording();
		const ancestorListener = vi.fn();
		container.addEventListener("keydown", ancestorListener);

		const event = await pressKey(input, init);

		expect(event.defaultPrevented).toBe(true);
		expect(ancestorListener).not.toHaveBeenCalled();
		expect(onCapture).toHaveBeenCalledExactlyOnceWith(combo);
		expect(container.querySelector("input")).toBeNull();
		expect(container.textContent).toBe("+");
	});

	test("displays capture errors, stays focused, and allows a successful retry", async () => {
		onCapture.mockReturnValueOnce("Already used by another shortcut");
		await showRecorder();
		const input = await beginRecording();

		await pressKey(input, { code: "KeyA", ctrlKey: true });

		expect(container.textContent).toBe("Already used by another shortcut");
		expect(container.querySelector("input")).toBe(input);
		expect(document.activeElement).toBe(input);

		await pressKey(input, { code: "KeyB", ctrlKey: true });

		expect(onCapture.mock.calls).toEqual([["ctrl+KeyA"], ["ctrl+KeyB"]]);
		expect(container.querySelector("input")).toBeNull();
		expect(container.textContent).toBe("+");
	});

	test("clears a previous error when starting a new recording", async () => {
		onCapture.mockReturnValue("Duplicate binding");
		await showRecorder();
		const input = await beginRecording();
		await pressKey(input, { code: "KeyA", altKey: true });
		expect(container.textContent).toBe("Duplicate binding");

		await act(() => input.blur());
		const nextInput = await beginRecording();

		expect(container.textContent).toBe("");
		expect(document.activeElement).toBe(nextInput);
	});
});
