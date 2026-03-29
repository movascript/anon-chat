import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";

// ! still not what i wanted should be more complex - like handling reconnections

export const useSocketStatus = () => {
	const socket = useAppStore((s) => s.socket);
	const [isConnected, setIsConnected] = useState(
		socket.currentState === "ready",
	);

	useEffect(() => {
		const handleOnline = () => setIsConnected(true);
		const handleOffline = () => setIsConnected(false);

		const authenticatedUnsub = socket.on("authenticated", handleOnline);
		const disconnectedUnsub = socket.on("disconnected", handleOffline);

		return () => {
			authenticatedUnsub();
			disconnectedUnsub();
		};
	}, [socket.on]);

	return isConnected;
};
