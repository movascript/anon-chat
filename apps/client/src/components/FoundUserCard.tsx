import { UserPlus } from "lucide-react"
import * as Contacts from "@/lib/contacts"
import type { SearchedContact } from "@/types"
import { Avatar } from "./Avatar"

export function FoundUserCard({ user }: { user: SearchedContact }) {
	return (
		<div className="flex animate-fade-in items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary">
			<Avatar userId={user.userID} name={user.displayName} />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-primary-foreground text-sm">{user.displayName}</p>
				<p className="truncate text-secondary-foreground text-xs">@{user.username}</p>
			</div>
			<button
				type="button"
				onClick={() => Contacts.sendChatRequest(user)}
				className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full p-2 px-3 text-xs transition-colors hover:bg-tertiary"
				aria-label="Send contact request"
			>
				<UserPlus className="h-5 w-5 text-secondary-foreground" />
				Send Request
			</button>
		</div>
	)
}
