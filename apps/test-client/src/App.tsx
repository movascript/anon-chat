import { useHotkey } from "@tanstack/react-hotkeys";
import { ErrorBoundary } from "react-error-boundary";
import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router";
import ErrorFallback from "./components/ErrorFallback";
import NoActiveView from "./components/NoActiveView";
import { useTheme } from "./hooks/useTheme";
import ChatListPage from "./pages/ChatListPage";
import { ChatViewPage } from "./pages/ChatViewPage";
import ContactProfilePage from "./pages/ContactProfilePage";
import LoginPage from "./pages/LoginPage";
import PrivacyPage from "./pages/PrivacyPage";
import SettingsPage from "./pages/SettingsPage";
import { useAppStore } from "./store/appStore";

function Protected({ children }: { children: React.ReactNode }) {
	const { isLoggedIn } = useAppStore();
	if (!isLoggedIn) return <Navigate to="/login" replace />;
	return <>{children}</>;
}

function AppRoutes() {
	const { isLoggedIn } = useAppStore();
	const { toggleTheme } = useTheme();
	const navigate = useNavigate();
	const location = useLocation();

	useHotkey("Control+Shift+T", toggleTheme);
	useHotkey("Escape", () => {
		// ! not ideal but does the job for now, refactor for future
		const path = location.pathname;

		if (path.startsWith("/profile/")) {
			const contactId = path.split("/")[2];
			navigate(`/chat/${contactId}`);
		} else if (path.startsWith("/chat/")) {
			navigate("/");
		} else if (path === "/settings") {
			navigate("/");
		} else if (path === "/privacy") {
			navigate("/settings");
		}
		// login and "/" → do nothing
	});

	return (
		<Routes>
			<Route
				path="/login"
				element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />}
			/>
			<Route path="/privacy" element={<PrivacyPage />} />

			<Route
				path="/"
				element={
					<Protected>
						<ChatListPage />
					</Protected>
				}
			>
				<Route path="/" element={<NoActiveView />} />
				<Route path="chat/:contactId" element={<ChatViewPage />} />
				<Route path="settings" element={<SettingsPage />} />
				<Route path="profile/:contactId" element={<ContactProfilePage />} />
			</Route>

			<Route
				path="*"
				element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />}
			/>
		</Routes>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<AppRoutes />
			</ErrorBoundary>
		</BrowserRouter>
	);
}
