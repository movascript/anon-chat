import {
	AlertCircle,
	ArrowRight,
	Loader2,
	MessageCircle,
	Moon,
	Sun,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../store/appStore";

const TAKEN_USERNAMES = ["admin", "root", "system", "anon", "test"];

type State = "idle" | "checking" | "taken" | "free" | "error";

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [state, setState] = useState<State>("idle");
	const [errorMsg, setErrorMsg] = useState("");
	const { login } = useAppStore();
	const { isDark, toggleTheme } = useTheme();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = username.trim().toLowerCase();
		if (!trimmed) return;

		if (trimmed.length < 3) {
			setState("error");
			setErrorMsg("Username must be at least 3 characters.");
			return;
		}
		if (!/^[a-z0-9_]+$/.test(trimmed)) {
			setState("error");
			setErrorMsg("Only letters, numbers, and underscores allowed.");
			return;
		}

		setState("checking");
		setErrorMsg("");

		await new Promise((r) => setTimeout(r, 1200));

		if (TAKEN_USERNAMES.includes(trimmed)) {
			setState("taken");
			setErrorMsg("This username is already taken. Try another one.");
			return;
		}

		setState("free");
		await new Promise((r) => setTimeout(r, 400));
		login(trimmed);
		navigate("/", { replace: true });
	};

	const isLoading = state === "checking";
	const isDisabled = isLoading || username.trim().length < 3;

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-primary px-6 relative">
			<button
				type="button"
				onClick={toggleTheme}
				className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary active:bg-tertiary transition-all duration-200"
				aria-label="Toggle theme"
			>
				{isDark ? (
					<Sun className="w-5 h-5 text-secondary-foreground" />
				) : (
					<Moon className="w-5 h-5 text-secondary-foreground" />
				)}
			</button>

			<div className="w-full max-w-sm animate-fade-in">
				{/* Logo */}
				<div className="flex flex-col items-center mb-10">
					<div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4 shadow-lg">
						<MessageCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
					</div>
					<h1 className="text-2xl font-bold text-primary-foreground">
						AnonChat
					</h1>
					<p className="text-sm text-secondary-foreground mt-1">
						No sign‑up. Just pick a username.
					</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<label
							htmlFor="username"
							className="block text-sm font-medium text-primary-foreground mb-1.5"
						>
							Choose a username
						</label>
						<div className="relative">
							<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-medium select-none">
								@
							</span>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => {
									setUsername(e.target.value);
									if (state !== "idle") setState("idle");
									setErrorMsg("");
								}}
								placeholder="your_username"
								autoComplete="off"
								maxLength={32}
								className={`
                  w-full pl-8 pr-4 py-3 rounded-xl text-sm
                  bg-input-bg text-primary-foreground
                  placeholder:text-muted
                  border-2 transition-all duration-200
                  focus:outline-none
                  ${
										state === "taken" || state === "error"
											? "border-red-500"
											: state === "free"
												? "border-green-500"
												: "border-transparent focus:border-accent"
									}
                `}
							/>
						</div>

						{(errorMsg || state === "free") && (
							<div
								className={`flex items-center gap-1.5 mt-2 text-xs font-medium animate-fade-in ${
									errorMsg ? "text-red-500" : "text-green-500"
								}`}
							>
								{errorMsg ? (
									<>
										<AlertCircle className="w-3.5 h-3.5 shrink-0" />
										{errorMsg}
									</>
								) : (
									<>✓ Username is available!</>
								)}
							</div>
						)}
					</div>

					<button
						type="submit"
						disabled={isDisabled}
						className={`
              w-full flex items-center justify-center gap-2
              py-3 rounded-xl text-sm font-semibold
              transition-all duration-200
              ${
								isDisabled
									? "bg-tertiary text-muted cursor-not-allowed"
									: "bg-accent hover:bg-accent-hover active:scale-[0.98] text-white shadow-sm"
							}
            `}
					>
						{isLoading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Checking…
							</>
						) : (
							<>
								Start chatting
								<ArrowRight className="w-4 h-4" />
							</>
						)}
					</button>
				</form>

				<p className="text-center text-xs text-muted mt-8">
					Your identity is anonymous. No login required.
				</p>
			</div>
		</div>
	);
}
