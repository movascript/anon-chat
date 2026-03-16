import type React from "react";
import { useNavigate } from "react-router";
import type { Contact } from "../types";
import { Avatar } from "./Avatar";
import { StatusIndicator } from "./StatusIndicator";

interface ContactListItemProps {
	contact: Contact;
	isActive?: boolean;
}

function formatTime(date?: Date): string {
	if (!date) return "";
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const days = Math.floor(diff / 86400000);
	if (days === 0)
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	if (days === 1) return "Yesterday";
	if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
	return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const ContactListItem: React.FC<ContactListItemProps> = ({
	contact,
	isActive = false,
}) => {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate(`/chat/${contact.id}`)}
			className={`
        w-full flex items-center gap-3 px-4 py-3 text-left
        transition-all duration-200
        ${
					isActive ? "bg-accent-light" : "hover:bg-secondary active:bg-tertiary"
				}
      `}
		>
			<div className="relative shrink-0">
				<Avatar name={contact.name} color={contact.avatarColor} size="md" />
				<div className="absolute -bottom-0.5 -right-0.5">
					<StatusIndicator isOnline={contact.isOnline} />
				</div>
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2">
					<span className="font-medium text-sm text-primary-foreground truncate">
						{contact.name}
					</span>
					<span className="text-xs text-muted shrink-0">
						{formatTime(contact.lastMessageTime)}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2 mt-0.5">
					<span
						className={`text-xs truncate ${
							contact.isTyping
								? "text-accent italic"
								: "text-secondary-foreground"
						}`}
					>
						{contact.isTyping
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
		</button>
	);
};
