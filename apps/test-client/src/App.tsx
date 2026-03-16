import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import ChatListPage from "./pages/ChatListPage";
import ContactProfilePage from "./pages/ContactProfilePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
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

				<Route
					path="/"
					element={
						<Protected>
							<ChatListPage />
						</Protected>
					}
				/>

				<Route
					path="/chat/:contactId"
					element={
						<Protected>
							<ChatListPage />
						</Protected>
					}
				/>

				<Route
					path="/profile"
					element={
						<Protected>
							<ProfilePage />
						</Protected>
					}
				/>

				<Route
					path="/profile/:contactId"
					element={
						<Protected>
							<ContactProfilePage />
						</Protected>
					}
				/>

				<Route
					path="*"
					element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}
