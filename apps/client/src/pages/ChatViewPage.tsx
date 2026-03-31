import type { MessageID } from "@repo/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
	ALargeSmall,
	ArrowLeft,
	Ban,
	Clock,
	MoreVertical,
	UserCheck,
	UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { Avatar } from "@/components/Avatar";
import InputBox from "@/components/InputBox";
import { MessageBubble } from "@/components/MessageBubble";
import { StatusIndicator } from "@/components/StatusIndicator";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAppStore } from "@/store/appStore";
import type { Message } from "@/types";
import { formatDateSeparator, isSameDay } from "@/utils/date";

type ListItem =
	| { kind: "date"; label: string; key: string }
	| { kind: "msg"; message: Message };

const STATUS_INFO = {
	pending_out: {
		icon: Clock,
		message: "Request sent. Waiting for acceptance...",
	},
	pending_in: {
		icon: UserCheck,
		message: "Contact request pending. Accept to start chatting.",
	},
	accepted: {
		icon: ALargeSmall,
		message: "This message should not be shown!",
	},
	declined: {
		icon: UserX,
		message: "Contact request was declined.",
	},
	blocked: {
		icon: Ban,
		message: "This contact is blocked.",
	},
};

export function ChatViewPage() {
	const { contactId } = useParams({ from: "/_app/chat/$contactId/" });
	const navigate = useNavigate();
	const getContact = useAppStore((s) => s.getContact);
	const getContactMessages = useAppStore((s) => s.getContactMessages);
	const markAsRead = useAppStore((s) => s.markAsRead);

	const contact = getContact(contactId);

	const [rawMessages, setRawMessages] = useState<Message[]>([]);

	useEffect(() => {
		if (contact?.status === "accepted") {
			getContactMessages(contactId).then(setRawMessages);
		}
	}, [contactId, contact?.status, getContactMessages]);

	const isTyping = useTypingIndicator(contactId ?? "");

	useEffect(() => {
		if (contactId && contact?.status === "accepted") markAsRead(contactId);
	}, [contactId, contact?.status, markAsRead]);

	const listItems: ListItem[] = useMemo(() => {
		const items: ListItem[] = [];
		rawMessages.forEach((msg, i) => {
			const prev = rawMessages[i - 1];
			if (!prev || !isSameDay(prev.ts, msg.ts)) {
				items.push({
					kind: "date",
					label: formatDateSeparator(msg.ts),
					key: `date_${i}`,
				});
			}
			items.push({ kind: "msg", message: msg });
		});
		if (isTyping) {
			items.push({
				kind: "msg",
				message: {
					id: "__typing__" as MessageID,
					userID: contactId,
					content: "",
					ts: Date.now(),
					sentByMe: false,
					status: "received",
				},
			});
		}
		return items;
	}, [rawMessages, isTyping, contactId]);

	if (!contactId || !contact) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-secondary-foreground text-sm">Contact not found.</p>
			</div>
		);
	}

	const subtitle = contact.online ? "Online" : "Offline";
	const isAccepted = contact.status === "accepted";

	return (
		<div className="flex flex-col h-full animate-fade-in bg-primary overflow-hidden">
			{/* Header */}
			<header className="flex items-center gap-3 px-4 h-16 bg-header-bg border-b border-border shadow-(--shadow) shrink-0 animate-slide-in-from-top-2">
				<button
					type="button"
					onClick={() => navigate({ to: "/" })}
					className="p-1.5 -ml-1 rounded-full hover:bg-secondary active:bg-tertiary transition-all duration-200"
				>
					<ArrowLeft className="w-5 h-5 text-primary-foreground" />
				</button>

				<button
					type="button"
					onClick={() =>
						navigate({
							to: "/chat/$contactId/profile",
							params: { contactId: contact.id },
						})
					}
					className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity duration-200"
				>
					<div className="relative shrink-0">
						<Avatar name={contact.displayName} color="red" size="md" />
						<div className="absolute -bottom-0.5 -right-0.5">
							<StatusIndicator isOnline={contact.online} />
						</div>
					</div>
					<div className="min-w-0 text-left">
						<p className="font-semibold text-sm text-primary-foreground truncate leading-tight">
							{contact.displayName}
						</p>
						<p
							className={`text-xs truncate leading-tight transition-colors duration-200 ${
								contact.online || isTyping
									? "text-accent"
									: "text-secondary-foreground"
							}`}
						>
							{isTyping ? "typing…" : subtitle}
						</p>
					</div>
				</button>

				<div className="flex items-center gap-0.5 shrink-0">
					<button
						type="button"
						onClick={() => {}}
						className="p-2 rounded-full hover:bg-secondary active:bg-tertiary transition-all duration-200"
						aria-label="More options"
					>
						<MoreVertical
							className="w-4.5 h-4.5 text-secondary-foreground"
							strokeWidth={2}
						/>
					</button>
				</div>
			</header>

			{/* Messages or Status Message */}
			<div className="flex-1 overflow-hidden">
				{!isAccepted ? (
					<div className="flex-1 flex flex-col items-center justify-center h-full animate-fade-in gap-3">
						{(() => {
							const StatusIcon = STATUS_INFO[contact.status].icon;
							return (
								<>
									<StatusIcon
										className="w-12 h-12 text-muted"
										strokeWidth={1.5}
									/>
									<p className="text-sm text-secondary-foreground text-center px-4">
										{STATUS_INFO[contact.status].message}
									</p>
								</>
							);
						})()}
					</div>
				) : listItems.length === 0 ? (
					<div className="flex-1 flex items-center justify-center h-full animate-fade-in">
						<p className="text-sm text-secondary-foreground">
							No messages yet. Say hi! 👋
						</p>
					</div>
				) : (
					<Virtuoso
						data={listItems}
						initialTopMostItemIndex={listItems.length - 1}
						followOutput="smooth"
						className="h-full"
						itemContent={(_index, item) => {
							if (item.kind === "date") {
								return (
									<div className="flex items-center justify-center py-3 px-4">
										<span className="text-xs text-muted bg-secondary px-3 py-1 rounded-full">
											{item.label}
										</span>
									</div>
								);
							}
							if (item.message.id === "__typing__") {
								return (
									<div className="px-4 py-0.5">
										<TypingIndicator />
									</div>
								);
							}
							return (
								<div className="px-4 py-0.5">
									<MessageBubble message={item.message} />
								</div>
							);
						}}
					/>
				)}
			</div>

			<InputBox contactId={contactId} disabled={!isAccepted} />
		</div>
	);
}
