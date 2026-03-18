import { Moon, Settings, Sun } from "lucide-react";
import { Outlet, useNavigate, useParams } from "react-router";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { cn } from "@/lib/utils";
import { Avatar } from "../components/Avatar";
import { ContactListItem } from "../components/ContactListItem";
import { NetworkStatus } from "../components/NetworkStatus";
import { SearchInput } from "../components/SearchInput";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../store/appStore";

export default function ChatListPage() {
	const { contacts, searchQuery, setSearchQuery, currentUser } = useAppStore();
	const { isDark, toggleTheme } = useTheme();
	const navigate = useNavigate();
	const { contactId } = useParams<{ contactId?: string }>();

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

	useKeyboardShortcut({
		shortcut: "esc",
		callback: () => {
			if (contactId) navigate("/");
		},
	});
	useKeyboardShortcut({
		shortcut: "ctrl+shift+t",
		callback: toggleTheme,
	});

	return (
		<div className="flex h-full w-full overflow-hidden bg-primary">
			<aside
				className={cn(
					"flex flex-col bg-sidebar-bg border-r border-border animate-fade-in shrink-0",
					contactId ? "hidden md:flex" : "flex",
					"w-full md:w-80 lg:w-96",
				)}
			>
				<div className="flex items-center gap-3 px-4 py-3 border-b border-border">
					<button
						type="button"
						onClick={() => navigate("/settings")}
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
								{totalUnread} unread
							</p>
						)}
					</div>

					<div className="flex items-center gap-1">
						<NetworkStatus />
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
							onClick={() => navigate("/settings")}
							className="p-2 rounded-full hover:bg-secondary active:bg-tertiary transition-all duration-200"
							aria-label="Settings"
						>
							<Settings className="w-4 h-4 text-secondary-foreground" />
						</button>
					</div>
				</div>

				<div className="px-4 py-3 border-b border-border">
					<SearchInput
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search or start new chat…"
					/>
				</div>

				<div className="flex-1 overflow-y-auto">
					{filtered.length === 0 && (
						<div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4 animate-fade-in">
							<p className="text-sm text-secondary-foreground">
								{searchQuery
									? "No contacts found. Enter full username to send request."
									: "No contacts yet."}
							</p>
						</div>
					)}
					{filtered.map((contact) => (
						<ContactListItem
							key={contact.id}
							contact={contact}
							isActive={contact.id === contactId}
						/>
					))}
				</div>
			</aside>

			<main
				className={cn(
					"flex-1 flex flex-col overflow-hidden",
					!contactId ? "hidden md:flex" : "flex",
				)}
			>
				<Outlet />
			</main>
		</div>
	);
}
