import { useNavigate, useParams } from "@tanstack/react-router";
import {
	Ban,
	Clock,
	Delete,
	MessageCircle,
	Trash2,
	UserCheck,
	UserX,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { InlineConfirmDialog } from "@/components/InlineConfirmDialog";
import { NavigationHeader } from "@/components/NavigationHeader";
import { StatusIndicator } from "@/components/StatusIndicator";
import { useAppStore } from "@/store/appStore";
import type { ContactStatus } from "@/types";

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
};

export default function ProfilePage() {
	const { contactId } = useParams({ from: "/_app/chat/$contactId/profile" });
	const navigate = useNavigate();
	const getContact = useAppStore((s) => s.getContact);
	const presenceMap = useAppStore((s) => s.presenceMap);
	const contact = getContact(contactId ?? "");

	const [showBlockConfirm, setShowBlockConfirm] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	if (!contact) {
		return (
			<div className="flex flex-col h-full bg-primary">
				<NavigationHeader title="Contact" showBack />
				<div className="flex-1 flex items-center justify-center">
					<p className="text-sm text-secondary-foreground">
						Contact not found.
					</p>
				</div>
			</div>
		);
	}

	const statusInfo = CONTACT_STATUS_INFO[contact.status];
	const StatusIcon = statusInfo.icon;
	const isAccepted = contact.status === "accepted";

	return (
		<div className="flex flex-col animate-fade-in h-full bg-primary">
			<NavigationHeader title="Contact Info" showBack />

			<div className="flex-1 overflow-y-auto">
				{/* Hero */}
				<div className="flex flex-col items-center py-8 px-4 bg-secondary border-b border-border">
					<div className="relative">
						<Avatar name={contact.displayName} color="#ffeeaa" size="xl" />
						<div className="absolute -bottom-1 -right-1">
							<StatusIndicator
								isOnline={presenceMap.get(contact.id)}
								size="md"
							/>
						</div>
					</div>
					<h2 className="mt-4 text-xl font-bold text-primary-foreground">
						{contact.displayName}
					</h2>
					<p className="text-sm text-secondary-foreground mt-0.5">
						@{contact.username}
					</p>
					<p
						className={`text-xs mt-2 font-medium ${
							presenceMap.get(contact.id) ? "text-accent" : "text-muted"
						}`}
					>
						{presenceMap.get(contact.id) ? "● Online" : "Last seen recently"}
					</p>

					{/* Contact status badge */}
					<div
						className={`flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium border border-current/20 bg-current/5 ${statusInfo.className}`}
					>
						<StatusIcon className="w-3 h-3" strokeWidth={2} />
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
						className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover active:scale-[0.98] text-white transition-all duration-200 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
					>
						<MessageCircle className="w-4 h-4" strokeWidth={2} />
						Send Message
					</button>

					{!isAccepted && (
						<p className="text-xs text-center text-secondary-foreground mt-2">
							{contact.status === "pending_out" &&
								"Messaging will be available once they accept your request."}
							{contact.status === "pending_in" &&
								"Accept the contact request to start messaging."}
							{contact.status === "declined" &&
								"This request was declined. Messaging is unavailable."}
							{contact.status === "blocked" &&
								"Unblock this contact to start messaging."}
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
							className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 transition-all duration-200"
						>
							<Ban className="w-4 h-4" />
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
							setShowBlockConfirm(false);
							navigate({ to: "/" });
						}}
					/>

					{/* Delete */}
					{!showDeleteConfirm && (
						<button
							type="button"
							onClick={() => setShowDeleteConfirm(true)}
							className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
						>
							<Trash2 className="w-4 h-4" />
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
							setShowDeleteConfirm(false);
							navigate({ to: "/" });
						}}
					/>
				</div>
			</div>
		</div>
	);
}
