import { TanStackDevtools } from "@tanstack/react-devtools";
import { HotkeysDevtoolsPanel } from "@tanstack/react-hotkeys-devtools";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "@/components/ErrorFallback";
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
	});

	return (
		<>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				{hydrated ? <Outlet /> : null}
			</ErrorBoundary>

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
