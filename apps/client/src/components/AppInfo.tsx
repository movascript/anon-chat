export function AppInfo() {
	const ua = navigator.userAgent
	const browser = ua.includes("Chrome")
		? "Chrome"
		: ua.includes("Firefox")
			? "Firefox"
			: ua.includes("Safari")
				? "Safari"
				: ua.includes("Edge")
					? "Edge"
					: "Unknown Browser"

	const os = ua.includes("Windows")
		? "Windows"
		: ua.includes("iPhone") || ua.includes("iPad")
			? "iOS"
			: ua.includes("Android")
				? "Android"
				: ua.includes("Linux")
					? "Linux"
					: ua.includes("Mac")
						? "macOS"
						: "Unknown OS"

	return (
		<div className="flex flex-col items-center gap-1 px-4 pb-8">
			<p className="text-center text-muted text-xs">Version 1.0.0</p>
			<p className="text-center text-muted text-xs">
				{browser} on {os}
			</p>
		</div>
	)
}
