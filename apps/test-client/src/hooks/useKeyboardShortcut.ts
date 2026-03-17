import { useCallback, useEffect, useRef } from "react";

// Base key types
type Letter =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z";
type Number = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type SpecialKey =
	| "enter"
	| "escape"
	| "esc"
	| "space"
	| "tab"
	| "backspace"
	| "delete"
	| "home"
	| "end"
	| "pageup"
	| "pagedown";
type ArrowKey =
	| "arrowup"
	| "arrowdown"
	| "arrowleft"
	| "arrowright"
	| "up"
	| "down"
	| "left"
	| "right";
type FunctionKey =
	| "f1"
	| "f2"
	| "f3"
	| "f4"
	| "f5"
	| "f6"
	| "f7"
	| "f8"
	| "f9"
	| "f10"
	| "f11"
	| "f12";
type Symbol = "/" | "\\" | "," | "." | ";" | "'" | "[" | "]" | "-" | "=" | "`";

type BaseKey = Letter | Number | SpecialKey | ArrowKey | FunctionKey | Symbol;
type Modifier = "ctrl" | "shift" | "alt" | "meta" | "cmd" | "mod";

// Type-safe shortcut combinations
type SingleKey = BaseKey;
type WithOneModifier = `${Modifier}+${BaseKey}`;
type WithTwoModifiers = `${Modifier}+${Modifier}+${BaseKey}`;
type WithThreeModifiers = `${Modifier}+${Modifier}+${Modifier}+${BaseKey}`;

type ValidShortcut =
	| SingleKey
	| WithOneModifier
	| WithTwoModifiers
	| WithThreeModifiers;

type ShortcutConfig = {
	shortcut: ValidShortcut;
	callback: (event: KeyboardEvent) => void;
	preventDefault?: boolean;
	enabled?: boolean;
};

type ParsedShortcut = {
	key: string;
	ctrl: boolean;
	shift: boolean;
	alt: boolean;
	meta: boolean;
};

const KEY_ALIASES: Record<string, string> = {
	esc: "escape",
	cmd: "meta",
	command: "meta",
	up: "arrowup",
	down: "arrowdown",
	left: "arrowleft",
	right: "arrowright",
};

const isMac =
	typeof navigator !== "undefined"
		? /Mac|iPhone|iPad|iPod/.test(navigator.platform)
		: false;

function parseShortcut(shortcut: ValidShortcut): ParsedShortcut {
	const parts = shortcut
		.toLowerCase()
		.split("+")
		.map((p) => p.trim());

	const parsed: ParsedShortcut = {
		key: "",
		ctrl: false,
		shift: false,
		alt: false,
		meta: false,
	};

	parts.forEach((part) => {
		const normalized = KEY_ALIASES[part] || part;

		switch (normalized) {
			case "ctrl":
			case "control":
				parsed.ctrl = true;
				break;
			case "shift":
				parsed.shift = true;
				break;
			case "alt":
			case "option":
				parsed.alt = true;
				break;
			case "meta":
				parsed.meta = true;
				break;
			case "mod":
				// 'mod' maps to Cmd on Mac, Ctrl on Windows/Linux
				if (isMac) {
					parsed.meta = true;
				} else {
					parsed.ctrl = true;
				}
				break;
			default:
				parsed.key = normalized;
		}
	});

	return parsed;
}

function normalizeKey(key: string): string {
	// Handle special cases where event.key differs from expected
	const keyMap: Record<string, string> = {
		" ": "space",
	};

	return keyMap[key] || key.toLowerCase();
}

export function useKeyboardShortcut(config: ShortcutConfig | ShortcutConfig[]) {
	const configRef = useRef(config);

	useEffect(() => {
		configRef.current = config;
	}, [config]);

	const handleKeyDown = useCallback((event: KeyboardEvent) => {
		const shortcuts = Array.isArray(configRef.current)
			? configRef.current
			: [configRef.current];

		shortcuts.forEach((shortcut) => {
			if (shortcut.enabled === false) return;

			const parsed = parseShortcut(shortcut.shortcut);

			const modifiersMatch =
				event.ctrlKey === parsed.ctrl &&
				event.shiftKey === parsed.shift &&
				event.altKey === parsed.alt &&
				event.metaKey === parsed.meta;

			const normalizedEventKey = normalizeKey(event.key);
			const keyMatch = normalizedEventKey === parsed.key;

			if (modifiersMatch && keyMatch) {
				if (shortcut.preventDefault !== false) {
					event.preventDefault();
				}
				shortcut.callback(event);
			}
		});
	}, []);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);
}
