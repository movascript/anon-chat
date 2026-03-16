import {
	Ban,
	ChevronRight,
	Image,
	MessageCircle,
	Phone,
	Trash2,
	Video,
} from "lucide-react";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Avatar } from "../components/Avatar";
import { NavigationHeader } from "../components/NavigationHeader";
import { StatusIndicator } from "../components/StatusIndicator";
import { useAppStore } from "../store/appStore";

function formatLastSeen(date?: Date): string {
	if (!date) return "a long time ago";
	const diff = Date.now() - date.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins} minutes ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs} hours ago`;
	return date.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

// Placeholder shared media colors
const MEDIA_COLORS = [
	"#3b82f6",
	"#ef4444",
	"#22c55e",
	"#f97316",
	"#8b5cf6",
	"#14b8a6",
	"#ec4899",
	"#eab308",
	"#06b6d4",
];

export default function ContactProfilePage() {
	const { contactId } = useParams<{ contactId: string }>();
	const navigate = useNavigate();
	const { getContact } = useAppStore();
	const contact = getContact(contactId ?? "");

	const [showBlockConfirm, setShowBlockConfirm] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	if (!contact) {
		return (
			<div className="flex flex-col h-full bg-[var(--bg-primary)]">
				<NavigationHeader title="Contact" showBack />
				<div className="flex-1 flex items-center justify-center">
					<p className="text-sm text-[var(--text-secondary)]">
						Contact not found.
					</p>
				</div>
			</div>
		);
	}

	const ActionButton = ({
		icon: Icon,
		label,
		color = "default",
		onClick,
	}: {
		icon: React.ElementType;
		label: string;
		color?: "default" | "danger";
		onClick?: () => void;
	}) => (
		<button
			type="button"
			onClick={onClick}
			className={`
        flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl flex-1
        transition-colors duration-150
        ${
					color === "danger"
						? "bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50"
						: "bg-[var(--bg-secondary)] text-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
				}
      `}
		>
			<Icon className="w-5 h-5" strokeWidth={2} />
			<span className="text-xs font-medium">{label}</span>
		</button>
	);

	return (
		<div className="flex flex-col h-full bg-[var(--bg-primary)]">
			<NavigationHeader title="Contact Info" showBack />

			<div className="flex-1 overflow-y-auto">
				{/* ── Hero ─────────────────────────────────────────────── */}
				<div className="flex flex-col items-center py-8 px-4 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
					<div className="relative">
						<Avatar name={contact.name} color={contact.avatarColor} size="xl" />
						<div className="absolute -bottom-1 -right-1">
							<StatusIndicator isOnline={contact.isOnline} size="md" />
						</div>
					</div>

					<h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
						{contact.name}
					</h2>
					<p className="text-sm text-[var(--text-secondary)] mt-0.5">
						@{contact.username}
					</p>

					<p
						className={`text-xs mt-2 font-medium ${contact.isOnline ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
					>
						{contact.isOnline
							? "● Online"
							: `Last seen ${formatLastSeen(contact.lastSeen)}`}
					</p>
				</div>

				{/* ── Action buttons ───────────────────────────────────── */}
				<div className="flex gap-2.5 px-4 py-4">
					<ActionButton
						icon={MessageCircle}
						label="Message"
						onClick={() => navigate(`/chat/${contact.id}`)}
					/>
					<ActionButton icon={Phone} label="Call" />
					<ActionButton icon={Video} label="Video" />
				</div>

				{/* ── Info ─────────────────────────────────────────────── */}
				<div className="mx-3 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-primary)]">
					<div className="px-4 py-3.5">
						<p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">
							Info
						</p>
						<div className="space-y-2.5">
							<div className="flex items-center justify-between">
								<span className="text-xs text-[var(--text-secondary)]">
									Username
								</span>
								<span className="text-sm font-medium text-[var(--text-primary)]">
									@{contact.username}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs text-[var(--text-secondary)]">
									Status
								</span>
								<span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
									<StatusIndicator isOnline={contact.isOnline} />
									{contact.isOnline ? "Online" : "Offline"}
								</span>
							</div>
							{!contact.isOnline && contact.lastSeen && (
								<div className="flex items-center justify-between">
									<span className="text-xs text-[var(--text-secondary)]">
										Last seen
									</span>
									<span className="text-sm font-medium text-[var(--text-primary)]">
										{formatLastSeen(contact.lastSeen)}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* ── Shared media ─────────────────────────────────────── */}
				<div className="mx-3 mt-4 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-primary)]">
					<button
						type="button"
						className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
					>
						<div className="flex items-center gap-2">
							<Image className="w-4 h-4 text-[var(--accent)]" />
							<span className="text-sm font-medium text-[var(--text-primary)]">
								Shared Media
							</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-xs text-[var(--text-muted)]">
								{MEDIA_COLORS.length} items
							</span>
							<ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
						</div>
					</button>

					{/* Media grid preview */}
					<div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
						{MEDIA_COLORS.map((color, i) => (
							<div
								key={i}
								className="aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
								style={{ backgroundColor: color + "33" }}
							>
								<Image className="w-5 h-5" style={{ color }} />
							</div>
						))}
					</div>
				</div>

				{/* ── Danger zone ──────────────────────────────────────── */}
				<div className="mx-3 mt-4 mb-8 space-y-2.5">
					{/* Block */}
					{showBlockConfirm ? (
						<div className="rounded-xl border border-red-200 dark:border-red-900 overflow-hidden bg-[var(--bg-primary)]">
							<div className="px-4 py-3.5">
								<p className="text-sm font-medium text-[var(--text-primary)]">
									Block {contact.name}?
								</p>
								<p className="text-xs text-[var(--text-secondary)] mt-0.5">
									They will not be able to send you messages.
								</p>
							</div>
							<div className="flex border-t border-[var(--border-color)]">
								<button
									type="button"
									onClick={() => setShowBlockConfirm(false)}
									className="flex-1 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
								>
									Cancel
								</button>
								<div className="w-px bg-[var(--border-color)]" />
								<button
									type="button"
									onClick={() => {
										setShowBlockConfirm(false);
										navigate("/");
									}}
									className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
								>
									Block
								</button>
							</div>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setShowBlockConfirm(true)}
							className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 transition-colors"
						>
							<Ban className="w-4 h-4" />
							Block User
						</button>
					)}

					{/* Delete */}
					{showDeleteConfirm ? (
						<div className="rounded-xl border border-red-200 dark:border-red-900 overflow-hidden bg-[var(--bg-primary)]">
							<div className="px-4 py-3.5">
								<p className="text-sm font-medium text-[var(--text-primary)]">
									Delete chat with {contact.name}?
								</p>
								<p className="text-xs text-[var(--text-secondary)] mt-0.5">
									This action cannot be undone.
								</p>
							</div>
							<div className="flex border-t border-[var(--border-color)]">
								<button
									type="button"
									onClick={() => setShowDeleteConfirm(false)}
									className="flex-1 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
								>
									Cancel
								</button>
								<div className="w-px bg-[var(--border-color)]" />
								<button
									type="button"
									onClick={() => {
										setShowDeleteConfirm(false);
										navigate("/");
									}}
									className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
								>
									Delete
								</button>
							</div>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setShowDeleteConfirm(true)}
							className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
						>
							<Trash2 className="w-4 h-4" />
							Delete Delete Chat
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
