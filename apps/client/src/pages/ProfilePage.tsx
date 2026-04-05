import { useNavigate, useParams } from "@tanstack/react-router"
import { Ban, Clock, Delete, MessageCircle, Trash2, UserCheck, UserX } from "lucide-react"
import { useState } from "react"
import { Avatar } from "@/components/Avatar"
import { InlineConfirmDialog } from "@/components/InlineConfirmDialog"
import { NavigationHeader } from "@/components/NavigationHeader"
import { StatusIndicator } from "@/components/StatusIndicator"
import * as Contacts from "@/lib/contacts"
import type { ContactStatus } from "@/types"

const CONTACT_STATUS_INFO: Record<
	ContactStatus,
	{ label: string; icon: React.ElementType; className: string }
> = {
	accepted: {
		icon: MessageCircle,
		label: "Connected",
		className: "text-accent",
	},
	pending_out: {
		icon: Clock,
		label: "Request Sent",
		className: "text-yellow-500",
	},
	pending_in: {
		icon: UserCheck,
		label: "Wants to Connect",
		className: "text-blue-500",
	},
	declined: {
		icon: UserX,
		label: "Request Declined",
		className: "text-red-500",
	},
	blocked: {
		icon: Ban,
		label: "Blocked",
		className: "text-red-500",
	},
	deleted: {
		icon: Delete,
		label: "deleted",
		className: "text-red-500",
	},
}

export default function ProfilePage() {
	const { contactId } = useParams({ from: "/_app/chat/$contactId/profile" })
	const navigate = useNavigate()
	const contact = Contacts.getContact(contactId ?? "")

	const [showBlockConfirm, setShowBlockConfirm] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	if (!contact) {
		return (
			<div className="flex h-full flex-col bg-primary">
				<NavigationHeader title="Contact" showBack />
				<div className="flex flex-1 items-center justify-center">
					<p className="text-secondary-foreground text-sm">Contact not found.</p>
				</div>
			</div>
		)
	}

	const statusInfo = CONTACT_STATUS_INFO[contact.status]
	const StatusIcon = statusInfo.icon
	const isAccepted = contact.status === "accepted"

	return (
		<div className="flex h-full animate-fade-in flex-col bg-primary">
			<NavigationHeader title="Contact Info" showBack />

			<div className="flex-1 overflow-y-auto">
				{/* Hero */}
				<div className="flex flex-col items-center border-border border-b bg-secondary px-4 py-8">
					<div className="relative">
						<Avatar userId={contact.id} name={contact.displayName} size="xl" />
						<div className="absolute -right-1 -bottom-1">
							<StatusIndicator isOnline={contact.online} size="md" />
						</div>
					</div>
					<h2 className="mt-4 font-bold text-primary-foreground text-xl">{contact.displayName}</h2>
					<p className="mt-0.5 text-secondary-foreground text-sm">@{contact.username}</p>
					<p
						className={`mt-2 font-medium text-xs ${contact.online ? "text-accent" : "text-muted"}`}
					>
						{contact.online ? "● Online" : "Last seen recently"}
					</p>

					{/* Contact status badge */}
					<div
						className={`mt-3 flex items-center gap-1.5 rounded-full border border-current/20 bg-current/5 px-3 py-1 font-medium text-xs ${statusInfo.className}`}
					>
						<StatusIcon className="h-3 w-3" strokeWidth={2} />
						{statusInfo.label}
					</div>
				</div>

				{/* Message action */}
				<div className="px-4 py-4">
					<button
						type="button"
						onClick={() =>
							navigate({
								to: "/chat/$contactId",
								params: { contactId: contact.id },
							})
						}
						disabled={!isAccepted}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-sm text-white shadow-sm transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
					>
						<MessageCircle className="h-4 w-4" strokeWidth={2} />
						Send Message
					</button>

					{!isAccepted && (
						<p className="mt-2 text-center text-secondary-foreground text-xs">
							{contact.status === "pending_out" &&
								"Messaging will be available once they accept your request."}
							{contact.status === "pending_in" && "Accept the contact request to start messaging."}
							{contact.status === "declined" &&
								"This request was declined. Messaging is unavailable."}
							{contact.status === "blocked" && "Unblock this contact to start messaging."}
						</p>
					)}
				</div>

				{/* Danger zone */}
				<div className="mx-4 mt-4 mb-8 space-y-2">
					{/* Block */}
					{!showBlockConfirm && (
						<button
							type="button"
							onClick={() => setShowBlockConfirm(true)}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 font-semibold text-red-500 text-sm transition-all duration-200 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
						>
							<Ban className="h-4 w-4" />
							Block User
						</button>
					)}
					<InlineConfirmDialog
						show={showBlockConfirm}
						variant="danger"
						title={`Block ${contact.displayName}?`}
						description="They will not be able to send you messages."
						confirmText="Block"
						onCancel={() => setShowBlockConfirm(false)}
						onConfirm={() => {
							setShowBlockConfirm(false)
							navigate({ to: "/" })
						}}
					/>

					{/* Delete */}
					{!showDeleteConfirm && (
						<button
							type="button"
							onClick={() => setShowDeleteConfirm(true)}
							className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 font-semibold text-red-500 text-sm transition-all duration-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
						>
							<Trash2 className="h-4 w-4" />
							Delete Chat
						</button>
					)}
					<InlineConfirmDialog
						show={showDeleteConfirm}
						variant="danger"
						title={`Delete chat with ${contact.displayName}?`}
						description="This action cannot be undone."
						confirmText="Delete"
						onCancel={() => setShowDeleteConfirm(false)}
						onConfirm={() => {
							setShowDeleteConfirm(false)
							navigate({ to: "/" })
						}}
					/>
				</div>
			</div>
		</div>
	)
}
