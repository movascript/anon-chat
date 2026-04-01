import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster, type ToasterProps } from "sonner";
import ErrorFallback from "@/components/ErrorFallback";
import { useAppStore } from "@/store/appStore";
import { useTheme } from "@/store/theme";
export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const hydrated = useAppStore((s) => s._hydrated);
	const identity = useAppStore((s) => s.identity);
	const syncStore = useAppStore((s) => s.syncStore);
	const navigate = useNavigate();
	const { theme = "system" } = useTheme();

	useEffect(() => {
		if (!hydrated) syncStore();
		else if (!identity) navigate({ to: "/login" });
	}, [navigate, syncStore, hydrated, identity]);

	return (
		<>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				{hydrated ? <Outlet /> : null}
			</ErrorBoundary>

			<Toaster
				theme={theme as ToasterProps["theme"]}
				className="toaster group"
			/>

			{/* <TanStackDevtools
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
			/> */}
		</>
	);
}
