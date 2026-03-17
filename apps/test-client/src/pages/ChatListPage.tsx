import { Edit, MessageCircle, Moon, Settings, Sun, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Avatar } from "../components/Avatar";
import { ContactListItem } from "../components/ContactListItem";
import { SearchInput } from "../components/SearchInput";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../store/appStore";
import { ChatViewPage } from "./ChatViewPage";

export default function ChatListPage() {
	const { contacts, searchQuery, setSearchQuery, currentUser } = useAppStore();
	const { isDark, toggleTheme } = useTheme();
	const navigate = useNavigate();
	const { contactId } = useParams<{ contactId?: string }>();
	const [showNewChat, setShowNewChat] = useState(false);

	const filtered = contacts.filter(
		(c) =>
			c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.username.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const totalUnread = contacts.reduce((acc, c) => acc + c.unreadCount, 0);

	const user = currentUser ?? {
		name: "User",
		username: "user",
		avatarColor: "#3b82f6",
	};

	return (
		<div className="flex h-full w-fulloverflow-hidden bg-primary">
			{/* Sidebar */}
			<aside
				className={`
          flex flex-col bg-sidebar-bg border-r border-border animate-fade-in 
          ${contactId ? "hidden md:flex" : "flex"}
          w-full md:w-80 lg:w-96 shrink-0
        `}
			>
				{/* Header */}
				<div className="flex items-center gap-3 px-4 py-3 border-b border-border">
					<button
						type="button"
						onClick={() => navigate("/profile")}
						className="relative shrink-0 transition-opacity duration-200 hover:opacity-80"
						aria-label="Profile"
					>
						<Avatar name={user.name} color={user.avatarColor} size="md" />
						<span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-online border-2 border-sidebar-bg" />
					</button>

					<div className="flex-1 min-w-0">
						<h1 className="font-bold text-base text-primary-foreground truncate leading-tight">
							AnonChat
						</h1>
						{totalUnread > 0 && (
							<p className="text-xs text-secondary-foreground animate-fade-in">
								{totalUnread} unread message{totalUnread > 1 ? "s" : ""}
							</p>
						)}
					</div>

					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={toggleTheme}
							className="p-2 rounded-full hover:bg-secondary active:bg-tertiary transition-all duration-200"
							aria-label="Toggle theme"
						>
							{isDark ? (
								<Sun className="w-4 h-4 text-secondary-foreground" />
							) : (
								<Moon className="w-4 h-4 text-secondary-foreground" />
							)}
						</button>
						<button
							type="button"
							onClick={() => navigate("/profile")}
							className="p-2 rounded-full hover:bg-secondary active:bg-tertiary transition-all duration-200"
							aria-label="Settings"
						>
							<Settings className="w-4 h-4 text-secondary-foreground" />
						</button>
					</div>
				</div>

				{/* Search */}
				<div className="px-4 py-3 border-b border-border">
					<SearchInput
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search contacts…"
					/>
				</div>

				{/* New Chat */}
				<div className="px-4 py-2">
					<button
						type="button"
						onClick={() => setShowNewChat(!showNewChat)}
						className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-accent hover:bg-accent-light active:bg-accent-light transition-all duration-200"
					>
						<Edit className="w-4 h-4" />
						New Chat
					</button>
				</div>

				{/* Contact list */}
				<div className="flex-1 overflow-y-auto">
					{filtered.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4 animate-fade-in">
							<Users className="w-10 h-10 text-muted opacity-40" />
							<p className="text-sm text-secondary-foreground">
								{searchQuery ? "No contacts found." : "No contacts yet."}
							</p>
						</div>
					) : (
						filtered.map((contact) => (
							<ContactListItem
								key={contact.id}
								contact={contact}
								isActive={contact.id === contactId}
							/>
						))
					)}
				</div>
			</aside>

			{/* Main panel */}
			<main
				className={`flex-1 flex flex-col overflow-hidden ${
					!contactId ? "hidden md:flex" : "flex"
				}`}
			>
				{contactId ? (
					<ChatViewPage />
				) : (
					<div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4 animate-fade-in">
						<MessageCircle className="w-14 h-14 text-muted opacity-25" />
						<div>
							<h2 className="text-base font-semibold text-primary-foreground">
								Select a conversation
							</h2>
							<p className="text-sm text-secondary-foreground mt-1">
								Choose a contact from the list to start chatting.
							</p>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
