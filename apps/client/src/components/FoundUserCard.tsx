import { UserPlus } from "lucide-react"
import { useAppStore } from "@/store/appStore"
import type { SearchedContact } from "@/types"

export function FoundUserCard({ user }: { user: SearchedContact }) {
	const sendChatRequest = useAppStore(s => s.sendChatRequest)

	return (
		<div className="flex animate-fade-in items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary">
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
				<span className="font-semibold text-accent-foreground text-sm">
					{user.displayName[0].toUpperCase()}
				</span>
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-primary-foreground text-sm">{user.displayName}</p>
				<p className="truncate text-secondary-foreground text-xs">@{user.username}</p>
			</div>
			<button
				type="button"
				onClick={() => sendChatRequest(user)}
				className="shrink-0 rounded-full p-2 transition-colors hover:bg-tertiary"
				aria-label="Send contact request"
			>
				<UserPlus className="h-4 w-4 text-secondary-foreground" />
			</button>
		</div>
	)
}
