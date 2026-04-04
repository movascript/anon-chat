import type { UserID } from "@repo/types"
import { createFileRoute } from "@tanstack/react-router"
import { ChatViewPage } from "@/pages/ChatViewPage"

export const Route = createFileRoute("/_app/chat/$contactId/")({
	component: ChatViewPage,
	params: { parse: params => ({ contactId: params.contactId as UserID }) },
})
