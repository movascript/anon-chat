import type { UserID } from "@repo/types"
import { createFileRoute } from "@tanstack/react-router"
import ProfilePage from "@/pages/ProfilePage"

export const Route = createFileRoute("/_app/chat/$contactId/profile")({
	component: ProfilePage,
	params: { parse: params => ({ contactId: params.contactId as UserID }) },
})
