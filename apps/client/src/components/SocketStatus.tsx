import { Wifi, WifiOff } from "lucide-react"
import { useSocketStatus } from "@/hooks/useSocketStatus"
import { cn } from "@/utils/className"

export function SocketStatus() {
	const isConnected = useSocketStatus()

	const Icon = isConnected ? Wifi : WifiOff
	const text = isConnected ? "Connected" : "Connecting"

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
				isConnected
					? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
					: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
			)}
		>
			<Icon className="w-3 h-3" />
			<span>{text}</span>
		</div>
	)
}
