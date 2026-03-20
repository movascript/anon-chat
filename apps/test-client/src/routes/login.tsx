import { createFileRoute, Navigate } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";
import { useAppStore } from "@/store/appStore";

export const Route = createFileRoute("/login")({
	component: function LoginRoute() {
		const { isLoggedIn } = useAppStore();
		if (isLoggedIn) return <Navigate to="/" replace />;
		return <LoginPage />;
	},
});
