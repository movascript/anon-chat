import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "../store";

export function ChatPage() {
	const { username, userID, status } = useAuthStore();
	const navigate = useNavigate();

	useEffect(() => {
		if (status !== "authenticated") {
			navigate({ to: "/" });
		}
	}, [status, navigate]);

	return (
		<div className="min-h-screen bg-zinc-950 flex items-center justify-center">
			<div className="text-center space-y-2">
				<p className="text-white text-lg font-medium">hey, {username}</p>
				<p className="text-zinc-500 text-xs font-mono">{userID}</p>
				<p className="text-zinc-600 text-sm mt-4">chat UI coming next</p>
			</div>
		</div>
	);
}
