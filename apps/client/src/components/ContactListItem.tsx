import { Link } from "@tanstack/react-router";
import { useAppStore } from "@/store/appStore";
import type { Contact } from "@/types";
import { cn } from "@/utils/className";
import { formatTime } from "@/utils/date";
import { Avatar } from "./Avatar";
import { StatusIndicator } from "./StatusIndicator";

interface ContactListItemProps {
	contact: Contact;
}

export function ContactListItem({ contact }: ContactListItemProps) {
	const presenceMap = useAppStore((s) => s.presenceMap);
	return (
		<Link
			to="/chat/$contactId"
			params={{ contactId: contact.id }}
			className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200"
			activeProps={{ className: "bg-accent-light" }}
			inactiveProps={{ className: "hover:bg-secondary active:bg-tertiary" }}
		>
			<div className="relative shrink-0">
				<Avatar name={contact.displayName} color="red" size="md" />
				<div className="absolute -bottom-0.5 -right-0.5">
					<StatusIndicator isOnline={presenceMap.get(contact.id)} />
				</div>
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2">
					<span className="font-medium text-sm text-primary-foreground truncate">
						{contact.displayName}
					</span>
					<span className="text-xs text-muted shrink-0">
						{formatTime(contact.lastMessageAt)}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2 mt-0.5">
					<span
						className={cn(
							"text-xs truncate",
							presenceMap.get(contact.id) // ! typing
								? "text-accent italic"
								: "text-secondary-foreground",
						)}
					>
						{presenceMap.get(contact.id) // ! typing
							? "typing…"
							: (contact.lastMessage ?? "No messages yet")}
					</span>
					{contact.unreadCount > 0 && (
						<span className="shrink-0 min-w-4.5 h-4.5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center px-1">
							{contact.unreadCount > 99 ? "99+" : contact.unreadCount}
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}
