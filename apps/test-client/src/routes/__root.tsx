import { TanStackDevtools } from "@tanstack/react-devtools";
import { HotkeysDevtoolsPanel } from "@tanstack/react-hotkeys-devtools";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster, type ToasterProps } from "sonner";
import ErrorFallback from "@/components/ErrorFallback";
import { useTheme } from "@/hooks/useTheme";
import { hydrateIdentity } from "@/lib/identity";
import { getOrInitializeSocket } from "@/lib/socket";
import { useAppStore } from "@/store/appStore";
export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const hydrated = useAppStore((s) => s._hydrated);
	const syncWithDB = useAppStore((s) => s.syncWithDB);
	const navigate = useNavigate();
	const { theme = "system" } = useTheme();

	useEffect(() => {
		hydrateIdentity()
			.then((identity) => {
				if (!identity) navigate({ to: "/login" });
				else {
					const socket = getOrInitializeSocket(identity);

					// to simulate production latency
					// ! should be removed on production
					setTimeout(() => socket.connect(), 200);
				}

				syncWithDB();
			})
			.catch((e) => console.log("couldnt fetch the identity from db", e));
	}, [navigate, syncWithDB]);

	return (
		<>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				{hydrated ? <Outlet /> : null}
			</ErrorBoundary>

			<Toaster
				theme={theme as ToasterProps["theme"]}
				className="toaster group"
			/>

			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "TanStack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
					{
						name: "TanStack Hotkeys",
						render: <HotkeysDevtoolsPanel />,
					},
				]}
			/>
		</>
	);
}
