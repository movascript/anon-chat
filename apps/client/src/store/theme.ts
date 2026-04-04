import { create } from "zustand"

export type Theme = "light" | "dark"

interface ThemeState {
	theme: Theme
	isDark: boolean
	toggleTheme: () => void
}

// Persist theme across sessions
const savedTheme = (localStorage.getItem("theme") as Theme) || "light"
if (savedTheme === "dark") document.documentElement.classList.add("dark")

export const useTheme = create<ThemeState>((set, get) => ({
	theme: savedTheme,
	isDark: savedTheme === "dark",
	toggleTheme: () => {
		const next = get().theme === "light" ? "dark" : "light"
		localStorage.setItem("theme", next)
		document.documentElement.classList.toggle("dark", next === "dark")
		set({ theme: next, isDark: next === "dark" })
	},
}))
