import { useAppStore } from "@/store/appStore";

export function useTheme() {
	const { theme, toggleTheme } = useAppStore();
	return { theme, toggleTheme, isDark: theme === "dark" };
}
