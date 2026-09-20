import type { ChartShortcutActionId } from "./actions";

export type ChartShortcutBindings = Record<ChartShortcutActionId, string[]>;

// Structural rather than the real KeyboardEvent so this stays unit-testable
// under Vitest's default node environment (no jsdom in this project).
export type KeyCombo = {
	code: string;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
};

const MODIFIER_ONLY_CODES = new Set([
	"ControlLeft",
	"ControlRight",
	"AltLeft",
	"AltRight",
	"ShiftLeft",
	"ShiftRight",
	"MetaLeft",
	"MetaRight",
]);

const CODE_LABELS: Record<string, string> = {
	Space: "Space",
	Enter: "Enter",
	NumpadEnter: "Numpad Enter",
};

// event.key is shift-dependent (shift+1 reports "!" on a US layout), which
// would make ctrl+shift+1/2/3 unrecordable and unmatchable. event.code
// reports the physical key regardless of modifiers, so combos are built on
// it instead.
export function comboFromEvent(event: KeyCombo): string {
	const modifiers: string[] = [];
	if (event.ctrlKey) modifiers.push("ctrl");
	if (event.altKey) modifiers.push("alt");
	if (event.shiftKey) modifiers.push("shift");
	if (event.metaKey) modifiers.push("meta");
	return [...modifiers, event.code].join("+");
}

function codeToLabel(code: string): string {
	if (code in CODE_LABELS) return CODE_LABELS[code];
	if (code.startsWith("Key")) return code.slice("Key".length);
	if (code.startsWith("Digit")) return code.slice("Digit".length);
	return code;
}

export const isMacPlatform =
	typeof navigator !== "undefined" &&
	/Mac|iPod|iPhone|iPad/.test(navigator.platform ?? "");

function modifierLabels(mac: boolean): Record<string, string> {
	if (mac) {
		return { ctrl: "⌃", alt: "⌥", shift: "⇧", meta: "⌘" };
	}
	return { ctrl: "Ctrl", alt: "Alt", shift: "Shift", meta: "Command" };
}

// mac defaults to real platform detection; tests override it so results
// don't depend on the host machine running the test.
export function formatCombo(
	combo: string,
	mac: boolean = isMacPlatform,
): string {
	const parts = combo.split("+");
	const code = parts.at(-1) ?? "";
	const modifiers = parts.slice(0, -1);
	const labels = modifierLabels(mac);
	const separator = mac ? " " : " + ";
	return [...modifiers.map((m) => labels[m] ?? m), codeToLabel(code)].join(
		separator,
	);
}

export function isModifierOnlyCode(code: string): boolean {
	return MODIFIER_ONLY_CODES.has(code);
}

// Chart-shortcuts' listener deliberately fires while the chart search input
// is focused (ctrl+1 while typing a query), so every combo must keep at
// least one of ctrl/alt/meta - otherwise a bare letter or shift+letter
// binding would swallow keystrokes meant for that input.
export function hasRequiredModifier(combo: string): boolean {
	const modifiers = new Set(combo.split("+").slice(0, -1));
	return modifiers.has("ctrl") || modifiers.has("alt") || modifiers.has("meta");
}

export function findComboConflict(
	bindings: ChartShortcutBindings,
	combo: string,
	excludingActionId: ChartShortcutActionId,
): ChartShortcutActionId | null {
	for (const [actionId, combos] of Object.entries(bindings) as [
		ChartShortcutActionId,
		string[],
	][]) {
		if (actionId === excludingActionId) continue;
		if (combos.includes(combo)) return actionId;
	}
	return null;
}

// Ctrl+letter (and Ctrl+1..8, which switches browser tabs) is heavily
// claimed by browser/OS shortcuts on Windows/Linux, several of which a
// content script can't even preventDefault - so ctrl isn't a safe default
// modifier there, mirroring how Cmd is the claimed modifier on macOS.
// A binding's "primary" placeholder resolves to ctrl on macOS and alt
// elsewhere; users can still rebind any action to any combo they want.
export function resolveDefaultBindings(
	template: readonly string[],
	mac: boolean = isMacPlatform,
): string[] {
	const modifier = mac ? "ctrl" : "alt";
	return template.map((combo) => combo.replace("primary", modifier));
}
