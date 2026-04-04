import { useNavigate, useParams } from "@tanstack/react-router"
import { ArrowLeft, Ban, Clock, MoreVertical, UserCheck, UserX } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Virtuoso } from "react-virtuoso"
import { Avatar } from "@/components/Avatar"
import InputBox from "@/components/InputBox"
import { MessageBubble } from "@/components/MessageBubble"
import { StatusIndicator } from "@/components/StatusIndicator"
import { TypingIndicator } from "@/components/TypingIndicator"
import { getMessages } from "@/lib/db"
import { useAppStore } from "@/store/appStore"
import type { Contact, Message } from "@/types"
import { formatDateSeparator, isSameDay } from "@/utils/date"

interface StatusViewProps {
	contact: Contact
	onNavigate: () => void
}

function PendingInView({ contact, onNavigate }: StatusViewProps) {
	const acceptChatRequest = useAppStore(s => s.acceptChatRequest)
	const declineChatRequest = useAppStore(s => s.declineChatRequest)

	return (
		<div className="flex h-full flex-1 animate-fade-in flex-col items-center justify-center gap-4 px-4">
			<UserCheck className="h-12 w-12 text-muted" strokeWidth={1.5} />
			<p className="text-center text-secondary-foreground text-sm">
				Contact request pending. Accept to start chatting.
			</p>
			<div className="flex w-full max-w-xs flex-col gap-2">
				<button
					type="button"
					onClick={() => {
						acceptChatRequest(contact.id)
						onNavigate()
					}}
					className="w-full rounded-xl bg-accent py-2.5 font-semibold text-sm text-white transition-all duration-200 hover:bg-accent-hover"
				>
					Accept
				</button>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => {
							declineChatRequest(contact.id)
							onNavigate()
						}}
						className="flex-1 rounded-xl border border-red-200 py-2.5 font-semibold text-red-500 text-sm transition-all duration-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
					>
						Decline
					</button>
					<button
						type="button"
						onClick={() => {
							declineChatRequest(contact.id, true)
							onNavigate()
						}}
						className="flex-1 rounded-xl bg-red-50 py-2.5 font-semibold text-red-500 text-sm transition-all duration-200 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
					>
						Block
					</button>
				</div>
			</div>
		</div>
	)
}

function BlockedView({ contact, onNavigate }: StatusViewProps) {
	const unblockContact = useAppStore(s => s.unblockContact)

	return (
		<div className="flex h-full flex-1 animate-fade-in flex-col items-center justify-center gap-4 px-4">
			<Ban className="h-12 w-12 text-muted" strokeWidth={1.5} />
			<p className="text-center text-secondary-foreground text-sm">This contact is blocked.</p>
			<button
				type="button"
				onClick={() => {
					unblockContact(contact.id)
					onNavigate()
				}}
				className="w-full max-w-xs rounded-xl bg-accent py-2.5 font-semibold text-sm text-white transition-all duration-200 hover:bg-accent-hover"
			>
				Unblock
			</button>
		</div>
	)
}

function DeclinedView({ contact, onNavigate }: StatusViewProps) {
	const deleteContact = useAppStore(s => s.deleteContact)

	return (
		<div className="flex h-full flex-1 animate-fade-in flex-col items-center justify-center gap-4 px-4">
			<UserX className="h-12 w-12 text-muted" strokeWidth={1.5} />
			<p className="text-center text-secondary-foreground text-sm">Contact request was declined.</p>
			<button
				type="button"
				onClick={() => {
					deleteContact(contact.id)
					onNavigate()
				}}
				className="w-full max-w-xs rounded-xl border border-red-200 py-2.5 font-semibold text-red-500 text-sm transition-all duration-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
			>
				Delete Contact
			</button>
		</div>
	)
}

function PendingOutView() {
	return (
		<div className="flex h-full flex-1 animate-fade-in flex-col items-center justify-center gap-3">
			<Clock className="h-12 w-12 text-muted" strokeWidth={1.5} />
			<p className="px-4 text-center text-secondary-foreground text-sm">
				Request sent. Waiting for acceptance...
			</p>
		</div>
	)
}
type ListItem = { kind: "date"; label: string; key: string } | { kind: "msg"; message: Message }

export function ChatViewPage() {
	const { contactId } = useParams({ from: "/_app/chat/$contactId/" })
	const navigate = useNavigate()
	const getContact = useAppStore(s => s.getContact)
	const markAsRead = useAppStore(s => s.markAsRead)

	const contact = getContact(contactId)

	const [rawMessages, setRawMessages] = useState<Message[]>([])

	useEffect(() => {
		if (contact?.status === "accepted") {
			getMessages(contactId).then(setRawMessages)
		}
	}, [contactId, contact?.status])

	useEffect(() => {
		if (contactId && contact?.status === "accepted") markAsRead(contactId)
	}, [contactId, contact?.status, markAsRead])

	const listItems: ListItem[] = useMemo(() => {
		const items: ListItem[] = []
		rawMessages.forEach((msg, i) => {
			const prev = rawMessages[i - 1]
			if (!prev || !isSameDay(prev.ts, msg.ts)) {
				items.push({
					kind: "date",
					label: formatDateSeparator(msg.ts),
					key: `date_${i}`,
				})
			}
			items.push({ kind: "msg", message: msg })
		})
		return items
	}, [rawMessages])

	if (!contactId || !contact) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p className="text-secondary-foreground text-sm">Contact not found.</p>
			</div>
		)
	}

	const isAccepted = contact.status === "accepted"

	return (
		<div className="flex h-full animate-fade-in flex-col overflow-hidden bg-primary">
			{/* Header */}
			<header className="flex h-16 shrink-0 animate-slide-in-from-top-2 items-center gap-3 border-border border-b bg-header-bg px-4 shadow-(--shadow)">
				<button
					type="button"
					onClick={() => navigate({ to: "/" })}
					className="-ml-1 rounded-full p-1.5 transition-all duration-200 hover:bg-secondary active:bg-tertiary"
				>
					<ArrowLeft className="h-5 w-5 text-primary-foreground" />
				</button>

				<button
					type="button"
					onClick={() =>
						navigate({
							to: "/chat/$contactId/profile",
							params: { contactId: contact.id },
						})
					}
					className="flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-200 hover:opacity-80"
				>
					<div className="relative shrink-0">
						<Avatar name={contact.displayName} color="red" size="md" />
						<div className="absolute -right-0.5 -bottom-0.5">
							<StatusIndicator isOnline={contact.online} />
						</div>
					</div>
					<div className="min-w-0 text-left">
						<p className="truncate font-semibold text-primary-foreground text-sm leading-tight">
							{contact.displayName}
						</p>
						<p
							className={`truncate text-xs leading-tight transition-colors duration-200 ${
								contact.online || contact.isTyping ? "text-accent" : "text-secondary-foreground"
							}`}
						>
							{contact.isTyping ? "typing…" : contact.online ? "Online" : "Offline"}
						</p>
					</div>
				</button>

				<div className="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						onClick={() => {}}
						className="rounded-full p-2 transition-all duration-200 hover:bg-secondary active:bg-tertiary"
						aria-label="More options"
					>
						<MoreVertical className="h-4.5 w-4.5 text-secondary-foreground" strokeWidth={2} />
					</button>
				</div>
			</header>

			{/* Messages or Status Message */}
			<div className="flex-1 overflow-hidden">
				{!isAccepted ? (
					<>
						{contact.status === "pending_in" && (
							<PendingInView contact={contact} onNavigate={() => navigate({ to: "/" })} />
						)}
						{contact.status === "pending_out" && <PendingOutView />}
						{contact.status === "blocked" && (
							<BlockedView contact={contact} onNavigate={() => navigate({ to: "/" })} />
						)}
						{contact.status === "declined" && (
							<DeclinedView contact={contact} onNavigate={() => navigate({ to: "/" })} />
						)}
					</>
				) : listItems.length === 0 ? (
					// ... rest of the code

					<div className="flex h-full flex-1 animate-fade-in items-center justify-center">
						<p className="text-secondary-foreground text-sm">No messages yet. Say hi! 👋</p>
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
									<div className="flex items-center justify-center px-4 py-3">
										<span className="rounded-full bg-secondary px-3 py-1 text-muted text-xs">
											{item.label}
										</span>
									</div>
								)
							}
							if (item.message.id === "__typing__") {
								return (
									<div className="px-4 py-0.5">
										<TypingIndicator />
									</div>
								)
							}
							return (
								<div className="px-4 py-0.5">
									<MessageBubble message={item.message} />
								</div>
							)
						}}
					/>
				)}
			</div>

			<InputBox contactId={contactId} disabled={!isAccepted} />
		</div>
	)
}
