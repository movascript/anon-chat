import type { UserID } from "@repo/types"
import { useHotkey } from "@tanstack/react-hotkeys"
import { createFileRoute, Navigate, useNavigate, useRouterState } from "@tanstack/react-router"
import ChatListPage from "@/pages/ChatListPage"
import { useAppStore } from "@/store/appStore"
import { useTheme } from "@/store/theme"

// layout warpper for app
export const Route = createFileRoute("/_app")({
	component: function ProtectedLayout() {
		const identity = useAppStore(s => s.identity)
		if (!identity) return <Navigate to="/login" replace />
		return (
			<>
				<ChatListPage />
				<HotkeyProvider />
			</>
		)
	},
})

function HotkeyProvider() {
	const { toggleTheme } = useTheme()
	const navigate = useNavigate()
	const { location } = useRouterState()

	useHotkey("Control+Shift+T", toggleTheme)
	useHotkey("Escape", () => {
		const path = location.pathname
		if (path.endsWith("profile")) {
			const contactId = path.split("/")[2] as UserID
			navigate({ to: "/chat/$contactId", params: { contactId } })
		} else if (path.startsWith("/chat/")) {
			navigate({ to: "/" })
		} else if (path === "/settings") {
			navigate({ to: "/" })
		} else if (path === "/privacy") {
			navigate({ to: "/settings" })
		}
	})

	return null
}
