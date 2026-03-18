import { BrowserRouter, Navigate, Route, Routes } from "react-router";
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

export default function App() {
	const { isLoggedIn } = useAppStore();

	return (
		<BrowserRouter>
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
					<Route path="chat/:contactId" element={<ChatViewPage />} />
					<Route path="settings" element={<SettingsPage />} />
					<Route path="profile/:contactId" element={<ContactProfilePage />} />
				</Route>

				<Route
					path="*"
					element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}
