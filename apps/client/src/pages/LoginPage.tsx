import { AlertCircle, ArrowRight, Github, Loader2, MessageCircle, Moon, Sun } from "lucide-react"
import { useState } from "react"
import { useAppStore } from "@/store/appStore"
import { useTheme } from "@/store/theme"
import { cn } from "@/utils/className"

type State = "idle" | "loading" | "success" | "error"

export default function LoginPage() {
	const [username, setUsername] = useState("")
	const [displayName, setDisplayName] = useState("")
	const [state, setState] = useState<State>("idle")
	const [errorMsg, setErrorMsg] = useState("")
	const login = useAppStore(s => s.login)
	const socket = useAppStore(s => s.socket)
	const { isDark, toggleTheme } = useTheme()

	// ! should make sure the submit handler is disabled when socket is on pending
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		const trimmedUsername = username.trim().toLowerCase()
		const trimmedName = displayName.trim()

		if (!trimmedUsername || !trimmedName) return

		if (trimmedUsername.length < 3) {
			setState("error")
			setErrorMsg("Username must be at least 3 characters.")
			return
		}
		if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
			setState("error")
			setErrorMsg("Only letters, numbers, and underscores allowed.")
			return
		}

		setState("loading")
		setErrorMsg("")
		await new Promise(r => setTimeout(r, 400))

		try {
			const unsubAuthSUccess = socket.on("auth_success", async () => {
				setState("success")

				unsubAuthSUccess()
				unsubAuthError()
			})
			const unsubAuthError = socket.on("auth_error", f => {
				setState("error")
				setErrorMsg(f.reason)

				unsubAuthSUccess()
				unsubAuthError()
			})
			login(username, displayName)
			setState("success")
		} catch (err) {
			console.error("Failed to generate identity:", err)
			setState("error")
			setErrorMsg("Failed to create account. Please try again.")
		} finally {
		}
	}

	const isLoading = state === "loading"
	const isDisabled = isLoading || username.trim().length < 3 || displayName.trim().length < 2

	return (
		<div className="min-h-screen overflow-auto h-full flex flex-col items-center justify-center bg-primary px-6 relative">
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
				<div className="flex flex-col items-center mb-10">
					<div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4 shadow-lg">
						<MessageCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
					</div>
					<h1 className="text-2xl font-bold text-primary-foreground">AnonChat</h1>
					<p className="text-sm text-secondary-foreground mt-1">Secure. Anonymous. No servers.</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<label
							htmlFor="displayName"
							className="block text-sm font-medium text-primary-foreground mb-1.5"
						>
							Display name
						</label>
						<input
							id="displayName"
							type="text"
							value={displayName}
							onChange={e => setDisplayName(e.target.value)}
							placeholder="Your Name"
							autoComplete="off"
							maxLength={32}
							disabled={isLoading}
							className="w-full px-4 py-3 rounded-xl text-sm bg-input-bg text-primary-foreground placeholder:text-muted border-2 border-transparent focus:border-accent focus:outline-none transition-all duration-200 disabled:opacity-50"
						/>
					</div>

					<div>
						<label
							htmlFor="username"
							className="block text-sm font-medium text-primary-foreground mb-1.5"
						>
							Choose a username
						</label>
						<div className="relative">
							<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">
								@
							</span>
							<input
								id="username"
								type="text"
								value={username}
								onChange={e => {
									setUsername(e.target.value)
									if (state !== "idle") setState("idle")
									setErrorMsg("")
								}}
								placeholder="your_username"
								autoComplete="off"
								maxLength={32}
								disabled={isLoading}
								className={cn(
									"w-full pl-8 pr-4 py-3 rounded-xl text-sm bg-input-bg text-primary-foreground placeholder:text-muted border-2 transition-all duration-200 focus:outline-none disabled:opacity-50",
									state === "error"
										? "border-red-500"
										: state === "success"
											? "border-green-500"
											: "border-transparent focus:border-accent"
								)}
							/>
						</div>

						{(errorMsg || state === "success") && (
							<div
								className={cn(
									"flex items-center gap-1.5 mt-2 text-xs font-medium animate-fade-in",
									errorMsg ? "text-red-500" : "text-green-500"
								)}
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
						className={cn(
							"w-full bg-red-700 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
							isDisabled
								? "bg-tertiary text-muted cursor-not-allowed"
								: "bg-accent hover:bg-accent-hover active:scale-[0.98] text-white shadow-sm"
						)}
					>
						{state === "loading" ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Creating account…
							</>
						) : (
							<>
								Start chatting
								<ArrowRight className="w-4 h-4" />
							</>
						)}
					</button>
				</form>

				<div className="mt-8 space-y-2 text-center">
					<p className="text-xs text-muted">End-to-end encrypted. No data stored.</p>
					<div className="flex items-center justify-center gap-4 text-xs">
						<a href="/about" className="text-accent hover:underline">
							About & Privacy
						</a>
						<a
							href="https://github.com/anonchat"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 text-accent hover:underline"
						>
							<Github className="w-3 h-3" />
							GitHub
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}
