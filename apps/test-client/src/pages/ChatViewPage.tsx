import { ArrowLeft, MoreVertical, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { formatDateSeparator, formatLastSeen, isSameDay } from "@/utils/date";
import { Avatar } from "../components/Avatar";
import { MessageBubble } from "../components/MessageBubble";
import { StatusIndicator } from "../components/StatusIndicator";
import { TypingIndicator } from "../components/TypingIndicator";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { useAppStore } from "../store/appStore";
import type { Message } from "../types";

type ListItem =
	| { kind: "date"; label: string; key: string }
	| { kind: "msg"; message: Message };

export function ChatViewPage() {
	const { contactId } = useParams<{ contactId: string }>();
	const navigate = useNavigate();
	const { getContact, getContactMessages, sendMessage, markAsRead } =
		useAppStore();

	const contact = getContact(contactId ?? "");
	const rawMessages = getContactMessages(contactId ?? "");

	const [inputText, setInputText] = useState("");
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const isTyping = useTypingIndicator(contactId ?? "");

	useEffect(() => {
		if (contactId) markAsRead(contactId);
	}, [contactId, markAsRead]);

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [inputText]);

	const listItems: ListItem[] = useMemo(() => {
		const items: ListItem[] = [];
		rawMessages.forEach((msg, i) => {
			const prev = rawMessages[i - 1];
			if (!prev || !isSameDay(prev.timestamp, msg.timestamp)) {
				items.push({
					kind: "date",
					label: formatDateSeparator(msg.timestamp),
					key: `date_${i}`,
				});
			}
			items.push({ kind: "msg", message: msg });
		});
		if (isTyping) {
			items.push({
				kind: "msg",
				message: {
					id: "__typing__",
					contactId: contactId ?? "",
					content: "",
					timestamp: new Date(),
					isSent: false,
					status: "read",
					type: "text",
				},
			});
		}
		return items;
	}, [rawMessages, isTyping, contactId]);

	const handleSend = useCallback(() => {
		const text = inputText.trim();
		if (!text || !contactId) return;
		sendMessage(contactId, text);
		setInputText("");
		setTimeout(() => {
			virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior: "smooth" });
		}, 50);
		textareaRef.current?.focus();
	}, [inputText, contactId, sendMessage]);

	const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	if (!contact) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-secondary-foreground text-sm">Contact not found.</p>
			</div>
		);
	}

	const subtitle = contact.isOnline
		? "Online"
		: contact.lastSeen
			? `Last seen ${formatLastSeen(contact.lastSeen)}`
			: "Offline";

	return (
		<div className="flex flex-col h-full animate-fade-in bg-primary overflow-hidden">
			{/* Header */}
			<header className="flex items-center gap-3 px-4 h-16 bg-header-bg border-b border-border shadow-(--shadow) shrink-0 animate-slide-in-from-top-2">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="p-1.5 -ml-1 rounded-full hover:bg-secondary active:bg-tertiary transition-all duration-200"
				>
					<ArrowLeft className="w-5 h-5 text-primary-foreground" />
				</button>

				<button
					type="button"
					onClick={() => navigate(`/profile/${contact.id}`)}
					className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity duration-200"
				>
					<div className="relative shrink-0">
						<Avatar name={contact.name} color={contact.avatarColor} size="md" />
						<div className="absolute -bottom-0.5 -right-0.5">
							<StatusIndicator isOnline={contact.isOnline} />
						</div>
					</div>
					<div className="min-w-0 text-left">
						<p className="font-semibold text-sm text-primary-foreground truncate leading-tight">
							{contact.name}
						</p>
						<p
							className={`text-xs truncate leading-tight transition-colors duration-200 ${
								contact.isOnline || isTyping
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

			{/* Messages */}
			<div className="flex-1 overflow-hidden">
				{listItems.length === 0 ? (
					<div className="flex-1 flex items-center justify-center h-full animate-fade-in">
						<p className="text-sm text-secondary-foreground">
							No messages yet. Say hi! 👋
						</p>
					</div>
				) : (
					<Virtuoso
						ref={virtuosoRef}
						data={listItems}
						initialTopMostItemIndex={listItems.length - 1}
						followOutput="smooth"
						className="h-full"
						style={{ padding: "8px 0" }}
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

			{/* Input */}
			<div className="shrink-0 px-4 py-3 bg-header-bg border-t border-border">
				<div className="flex items-end gap-2">
					<div className="flex-1 flex items-center bg-input-bg rounded-full px-4 py-2.5 transition-all duration-200 focus-within:ring-1 focus-within:ring-accent">
						<textarea
							ref={textareaRef}
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							onKeyDown={handleKey}
							placeholder="Message…"
							rows={1}
							className="flex-1 bg-transparent text-sm text-primary-foreground placeholder:text-muted focus:outline-none resize-none max-h-32 overflow-y-auto"
						/>
					</div>

					<button
						type="button"
						onClick={handleSend}
						disabled={!inputText.trim()}
						aria-label="Send"
						className={`
              p-2.5 rounded-full transition-all duration-200 shrink-0 text-sm font-semibold
              ${
								inputText.trim()
									? "bg-accent hover:bg-accent-hover active:scale-95 text-white shadow-sm"
									: "bg-tertiary text-muted cursor-not-allowed"
							}
            `}
					>
						<Send className="w-4.5 h-4.5" strokeWidth={2.5} />
					</button>
				</div>
			</div>
		</div>
	);
}

export default ChatViewPage;
