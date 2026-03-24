import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/utils/className";

export function NetworkStatus() {
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const Icon = isOnline ? Wifi : WifiOff;
	const text = isOnline ? "Connected" : "Offline";

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
				isOnline
					? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
					: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
			)}
		>
			<Icon className="w-3 h-3" />
			<span>{text}</span>
		</div>
	);
}
