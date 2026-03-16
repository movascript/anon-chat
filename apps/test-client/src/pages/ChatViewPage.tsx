import {
	ArrowLeft,
	Info,
	MoreVertical,
	Paperclip,
	Phone,
	Send,
	Smile,
	Video,
} from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Avatar } from "../components/Avatar";
import { MessageBubble } from "../components/MessageBubble";
import { StatusIndicator } from "../components/StatusIndicator";
import { TypingIndicator } from "../components/TypingIndicator";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { useAppStore } from "../store/appStore";
import type { Message } from "../types";

function formatLastSeen(date?: Date): string {
	if (!date) return "";
	const diff = Date.now() - date.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Date separator helpers
function isSameDay(a: Date, b: Date) {
	return a.toDateString() === b.toDateString();
}
function formatDateSep(date: Date): string {
	const now = new Date();
	if (isSameDay(date, now)) return "Today";
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (isSameDay(date, yesterday)) return "Yesterday";
	return date.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

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
	const inputRef = useRef<HTMLInputElement>(null);

	const isTyping = useTypingIndicator(contactId ?? "");

	// Mark as read on open
	React.useEffect(() => {
		if (contactId) markAsRead(contactId);
	}, [contactId, markAsRead]);

	// Build flat list with date separators
	const listItems: ListItem[] = React.useMemo(() => {
		const items: ListItem[] = [];
		rawMessages.forEach((msg, i) => {
			const prev = rawMessages[i - 1];
			if (!prev || !isSameDay(prev.timestamp, msg.timestamp)) {
				items.push({
					kind: "date",
					label: formatDateSep(msg.timestamp),
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
		// Scroll to bottom after send
		setTimeout(() => {
			virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior: "smooth" });
		}, 50);
		inputRef.current?.focus();
	}, [inputText, contactId, sendMessage]);

	const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	if (!contact) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-[var(--text-secondary)] text-sm">
					Contact not found.
				</p>
			</div>
		);
	}

	const subtitle = contact.isOnline
		? "Online"
		: contact.lastSeen
			? `Last seen ${formatLastSeen(contact.lastSeen)}`
			: "Offline";

	return (
		<div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
			{/* ─── Header ────────────────────────────────────────────── */}
			<header className="flex items-center gap-2 px-3 py-2.5 bg-[var(--header-bg)] border-b border-[var(--border-color)] shadow-[var(--shadow)] shrink-0">
				{/* Back (mobile) */}
				<button
					type="button"
					onClick={() => navigate("/")}
					className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
				>
					<ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
				</button>

				{/* Avatar + info */}
				<button
					type="button"
					onClick={() => navigate(`/profile/${contact.id}`)}
					className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity"
				>
					<div className="relative shrink-0">
						<Avatar name={contact.name} color={contact.avatarColor} size="md" />
						<div className="absolute -bottom-0.5 -right-0.5">
							<StatusIndicator isOnline={contact.isOnline} />
						</div>
					</div>
					<div className="min-w-0 text-left">
						<p className="font-semibold text-sm text-[var(--text-primary)] truncate leading-tight">
							{contact.name}
						</p>
						<p
							className={`text-xs truncate leading-tight ${
								contact.isOnline
									? "text-[var(--accent)]"
									: "text-[var(--text-secondary)]"
							}`}
						>
							{isTyping ? "typing…" : subtitle}
						</p>
					</div>
				</button>

				{/* Actions */}
				<div className="flex items-center gap-0.5 shrink-0">
					<button
						type="button"
						className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
						aria-label="Call"
					>
						<Phone
							className="w-4.5 h-4.5 text-[var(--text-secondary)]"
							strokeWidth={2}
						/>
					</button>
					<button
						type="button"
						className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
						aria-label="Video call"
					>
						<Video
							className="w-4.5 h-4.5 text-[var(--text-secondary)]"
							strokeWidth={2}
						/>
					</button>
					<button
						type="button"
						onClick={() => navigate(`/profile/${contact.id}`)}
						className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
						aria-label="Info"
					>
						<Info
							className="w-4.5 h-4.5 text-[var(--text-secondary)]"
							strokeWidth={2}
						/>
					</button>
					<button
						type="button"
						className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
						aria-label="More"
					>
						<MoreVertical
							className="w-4.5 h-4.5 text-[var(--text-secondary)]"
							strokeWidth={2}
						/>
					</button>
				</div>
			</header>

			{/* ─── Messages ──────────────────────────────────────────── */}
			<div className="flex-1 overflow-hidden">
				{listItems.length === 0 ? (
					<div className="flex-1 flex items-center justify-center h-full">
						<p className="text-sm text-[var(--text-secondary)]">
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
										<span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full">
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

			{/* ─── Input ─────────────────────────────────────────────── */}
			<div className="shrink-0 px-3 py-3 bg-[var(--header-bg)] border-t border-[var(--border-color)]">
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors shrink-0"
						aria-label="Attach"
					>
						<Paperclip
							className="w-5 h-5 text-[var(--text-secondary)]"
							strokeWidth={2}
						/>
					</button>

					<div className="flex-1 relative flex items-center bg-[var(--input-bg)] rounded-full px-4 py-2.5">
						<input
							ref={inputRef}
							type="text"
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							onKeyDown={handleKey}
							placeholder="Message…"
							className="
                flex-1 bg-transparent text-sm text-[var(--text-primary)]
                placeholder:text-[var(--text-muted)] focus:outline-none
              "
						/>
						<button type="button" className="ml-2 shrink-0" aria-label="Emoji">
							<Smile className="w-4.5 h-4.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors" />
						</button>
					</div>

					<button
						type="button"
						onClick={handleSend}
						disabled={!inputText.trim()}
						aria-label="Send"
						className={`
              p-2.5 rounded-full transition-all duration-150 shrink-0
              ${
								inputText.trim()
									? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-90 text-white shadow-sm"
									: "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed"
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
