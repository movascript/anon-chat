import { Moon, Settings, Sun, UsersRound } from "lucide-react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router";
import { cn } from "@/lib/utils";
import { ContactListItem } from "../components/ContactListItem";
import { NetworkStatus } from "../components/NetworkStatus";
import { SearchInput } from "../components/SearchInput";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../store/appStore";

export default function ChatListPage() {
	const { contacts, searchQuery, setSearchQuery } = useAppStore();
	const { isDark, toggleTheme } = useTheme();
	const navigate = useNavigate();
	const { contactId } = useParams<{ contactId?: string }>();
	const location = useLocation();

	const filtered = contacts.filter(
		(c) =>
			c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.username.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const hasOutlet = location.pathname !== "/";

	return (
		<div className="flex h-full w-full overflow-hidden bg-primary">
			<aside
				className={cn(
					"flex flex-col bg-sidebar-bg border-r border-border animate-fade-in shrink-0",
					hasOutlet ? "hidden md:flex" : "flex",
					"w-full md:w-80 lg:w-96",
				)}
			>
				<div className="flex h-16 items-center gap-3 px-5  border-b border-border">
					<div className="flex-1 min-w-0">
						<h1 className="font-bold text-xl text-primary-foreground truncate leading-tight">
							AnonChat
						</h1>
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
						<div className="flex flex-col items-center justify-center text-secondary-foreground text-sm h-80 gap-2 text-center px-4 animate-fade-in">
							<UsersRound size={30} className="mb-2" />
							<p>{searchQuery ? "No contacts found." : "No contacts yet."}</p>
							<p>Enter full username to send request.</p>
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
					!hasOutlet ? "hidden md:flex" : "flex",
				)}
			>
				<Outlet />
			</main>
		</div>
	);
}
