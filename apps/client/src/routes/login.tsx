import { createFileRoute, Navigate } from "@tanstack/react-router"
import LoginPage from "@/pages/LoginPage"
import { useAppStore } from "@/store/appStore"

export const Route = createFileRoute("/login")({
	component: function LoginRoute() {
		const identity = useAppStore(s => s.identity)
		if (identity) return <Navigate to="/" replace />

		return <LoginPage />
	},
})
