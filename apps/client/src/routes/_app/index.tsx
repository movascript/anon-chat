import { createFileRoute } from "@tanstack/react-router";
import NoActiveView from "@/components/NoActiveView";

export const Route = createFileRoute("/_app/")({
	component: NoActiveView,
});
