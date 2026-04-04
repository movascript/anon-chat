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
				"flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-xs transition-colors",
				isConnected
					? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
					: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
			)}
		>
			<Icon className="h-3 w-3" />
			<span>{text}</span>
		</div>
	)
}
