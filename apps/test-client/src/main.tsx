import {
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChatPage } from "./routes/chat";
import { LandingPage } from "./routes/index";
import "./styles.css";

const rootRoute = createRootRoute();

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: LandingPage,
});

const chatRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/chat",
	component: ChatPage,
});

const routeTree = rootRoute.addChildren([indexRoute, chatRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById("app")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
