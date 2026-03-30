import { UserPlus } from "lucide-react";
import { ContactsManager } from "@/lib/contacts";
import type { SearchedContact } from "@/types";

export function FoundUserCard({ user }: { user: SearchedContact }) {
	return (
		<div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors animate-fade-in">
			<div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
				<span className="text-sm font-semibold text-accent-foreground">
					{user.displayName[0].toUpperCase()}
				</span>
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-primary-foreground truncate">
					{user.displayName}
				</p>
				<p className="text-xs text-secondary-foreground truncate">
					@{user.username}
				</p>
			</div>
			<button
				type="button"
				onClick={() => ContactsManager.sendRequest(user)}
				className="p-2 rounded-full hover:bg-tertiary transition-colors shrink-0"
				aria-label="Send contact request"
			>
				<UserPlus className="w-4 h-4 text-secondary-foreground" />
			</button>
		</div>
	);
}
