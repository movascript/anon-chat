import { Ban, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { formatLastSeen } from "@/utils/date";
import { Avatar } from "../components/Avatar";
import { InlineConfirmDialog } from "../components/InlineConfirmDialog";
import { NavigationHeader } from "../components/NavigationHeader";
import { StatusIndicator } from "../components/StatusIndicator";
import { useAppStore } from "../store/appStore";

export default function ContactProfilePage() {
	const { contactId } = useParams<{ contactId: string }>();
	const navigate = useNavigate();
	const { getContact } = useAppStore();
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

	return (
		<div className="flex flex-col animate-fade-in h-full bg-primary">
			<NavigationHeader title="Contact Info" showBack />

			<div className="flex-1 overflow-y-auto">
				{/* Hero */}
				<div className="flex flex-col items-center py-8 px-4 bg-secondary border-b border-border">
					<div className="relative">
						<Avatar name={contact.name} color={contact.avatarColor} size="xl" />
						<div className="absolute -bottom-1 -right-1">
							<StatusIndicator isOnline={contact.isOnline} size="md" />
						</div>
					</div>
					<h2 className="mt-4 text-xl font-bold text-primary-foreground">
						{contact.name}
					</h2>
					<p className="text-sm text-secondary-foreground mt-0.5">
						@{contact.username}
					</p>
					<p
						className={`text-xs mt-2 font-medium ${
							contact.isOnline ? "text-accent" : "text-muted"
						}`}
					>
						{contact.isOnline
							? "● Online"
							: `Last seen ${formatLastSeen(contact.lastSeen)}`}
					</p>
				</div>

				{/* Message action */}
				<div className="px-4 py-4">
					<button
						type="button"
						onClick={() => navigate(`/chat/${contact.id}`)}
						className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover active:scale-[0.98] text-white transition-all duration-200 shadow-sm"
					>
						<MessageCircle className="w-4 h-4" strokeWidth={2} />
						Send Message
					</button>
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
						title={`Block ${contact.name}?`}
						description="They will not be able to send you messages."
						confirmText="Block"
						onCancel={() => setShowBlockConfirm(false)}
						onConfirm={() => {
							setShowBlockConfirm(false);
							navigate("/");
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
						title={`Delete chat with ${contact.name}?`}
						description="This action cannot be undone."
						confirmText="Delete"
						onCancel={() => setShowDeleteConfirm(false)}
						onConfirm={() => {
							setShowDeleteConfirm(false);
							navigate("/");
						}}
					/>
				</div>
			</div>
		</div>
	);
}
