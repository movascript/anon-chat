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
		<div className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-auto bg-primary px-6">
			<button
				type="button"
				onClick={toggleTheme}
				className="absolute top-4 right-4 rounded-full p-2 transition-all duration-200 hover:bg-secondary active:bg-tertiary"
				aria-label="Toggle theme"
			>
				{isDark ? (
					<Sun className="h-5 w-5 text-secondary-foreground" />
				) : (
					<Moon className="h-5 w-5 text-secondary-foreground" />
				)}
			</button>

			<div className="w-full max-w-sm animate-fade-in">
				<div className="mb-10 flex flex-col items-center">
					<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg">
						<MessageCircle className="h-8 w-8 text-white" strokeWidth={2.5} />
					</div>
					<h1 className="font-bold text-2xl text-primary-foreground">AnonChat</h1>
					<p className="mt-1 text-secondary-foreground text-sm">Secure. Anonymous. No servers.</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<label
							htmlFor="displayName"
							className="mb-1.5 block font-medium text-primary-foreground text-sm"
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
							className="w-full rounded-xl border-2 border-transparent bg-input-bg px-4 py-3 text-primary-foreground text-sm transition-all duration-200 placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50"
						/>
					</div>

					<div>
						<label
							htmlFor="username"
							className="mb-1.5 block font-medium text-primary-foreground text-sm"
						>
							Choose a username
						</label>
						<div className="relative">
							<span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-medium text-muted text-sm">
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
									"w-full rounded-xl border-2 bg-input-bg py-3 pr-4 pl-8 text-primary-foreground text-sm transition-all duration-200 placeholder:text-muted focus:outline-none disabled:opacity-50",
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
									"mt-2 flex animate-fade-in items-center gap-1.5 font-medium text-xs",
									errorMsg ? "text-red-500" : "text-green-500"
								)}
							>
								{errorMsg ? (
									<>
										<AlertCircle className="h-3.5 w-3.5 shrink-0" />
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
							"flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-semibold text-sm transition-all duration-200",
							isDisabled
								? "cursor-not-allowed bg-tertiary text-muted"
								: "bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-[0.98]"
						)}
					>
						{state === "loading" ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Creating account…
							</>
						) : (
							<>
								Start chatting
								<ArrowRight className="h-4 w-4" />
							</>
						)}
					</button>
				</form>

				<div className="mt-8 space-y-2 text-center">
					<p className="text-muted text-xs">End-to-end encrypted. No data stored.</p>
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
							<Github className="h-3 w-3" />
							GitHub
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}
