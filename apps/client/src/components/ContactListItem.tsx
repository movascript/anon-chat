import { Link } from "@tanstack/react-router"
import type { RuntimeContact } from "@/types"
import { cn } from "@/utils/className"
import { formatTime } from "@/utils/date"
import { Avatar } from "./Avatar"
import { StatusIndicator } from "./StatusIndicator"

export function ContactListItem({ contact }: { contact: RuntimeContact }) {
	return (
		<Link
			to="/chat/$contactId"
			params={{ contactId: contact.id }}
			className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200"
			activeProps={{ className: "bg-accent-light" }}
			inactiveProps={{ className: "hover:bg-secondary active:bg-tertiary" }}
		>
			<div className="relative shrink-0">
				<Avatar name={contact.displayName} color="red" size="md" />
				<div className="absolute -right-0.5 -bottom-0.5">
					<StatusIndicator isOnline={contact.online} />
				</div>
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					<span className="truncate font-medium text-primary-foreground text-sm">
						{contact.displayName}
					</span>
					<span className="shrink-0 text-muted text-xs">{formatTime(contact.lastMessageAt)}</span>
				</div>
				<div className="mt-0.5 flex items-center justify-between gap-2">
					<span
						className={cn(
							"truncate text-xs",
							contact.isTyping ? "text-accent italic" : "text-secondary-foreground"
						)}
					>
						{contact.isTyping ? "typing…" : (contact.lastMessage ?? "No messages yet")}
					</span>
					{contact.unreadCount > 0 && (
						<span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-accent px-1 font-bold text-[10px] text-white">
							{contact.unreadCount > 99 ? "99+" : contact.unreadCount}
						</span>
					)}
				</div>
			</div>
		</Link>
	)
}
