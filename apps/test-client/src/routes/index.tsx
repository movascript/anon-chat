import { useNavigate } from "@tanstack/react-router";
import { LogIn, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store";
import { useAuth } from "../useAuth";

export function LandingPage() {
	const [username, setUsername] = useState("");
	const { login, status } = useAuth();
	const error = useAuthStore((s) => s.error);
	const authStatus = useAuthStore((s) => s.status);
	const navigate = useNavigate();

	useEffect(() => {
		if (authStatus === "authenticated") {
			navigate({ to: "/chat" });
		}
	}, [authStatus, navigate]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (username.trim().length < 3) return;
		login(username.trim());
	}

	const busy = status === "connecting" || status === "authenticating";

	return (
		<div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="text-center space-y-1">
					<h1 className="text-2xl font-semibold text-white">AnonChat</h1>
					<p className="text-zinc-400 text-sm">no account, no trace</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="relative">
						<User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
						<input
							type="text"
							placeholder="pick a username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							disabled={busy}
							minLength={3}
							maxLength={32}
							pattern="[a-zA-Z0-9_]+"
							className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
						/>
					</div>

					{error && <p className="text-red-400 text-sm px-1">{error}</p>}

					<button
						type="submit"
						disabled={busy || username.trim().length < 3}
						className="w-full flex items-center justify-center gap-2 bg-white text-zinc-950 rounded-lg py-2.5 font-medium hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						<LogIn className="w-4 h-4" />
						{busy
							? status === "connecting"
								? "connecting…"
								: "authenticating…"
							: "join"}
					</button>
				</form>

				<p className="text-center text-zinc-600 text-xs">
					your keypair lives in localStorage — same key, same identity
				</p>
			</div>
		</div>
	);
}
