import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { Moon, Settings, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { ContactListItem } from "@/components/ContactListItem"
import { EmptyState } from "@/components/EmptyState"
import { FoundUserCard } from "@/components/FoundUserCard"
import { SearchInput } from "@/components/SearchInput"
import { SocketStatus } from "@/components/SocketStatus"
import useDebounce from "@/hooks/useDebounce"
import { useAppStore } from "@/store/appStore"
import { useTheme } from "@/store/theme"
import type { SearchedContact } from "@/types"
import { cn } from "@/utils/className"

export default function ChatListPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [foundedUser, setFoundedUser] = useState<SearchedContact | null>(null)
	const [isSearching, setIsSearching] = useState(false)

	const contacts = useAppStore(s => s.contacts)
	const socket = useAppStore(s => s.socket)
	const { isDark, toggleTheme } = useTheme()
	const navigate = useNavigate()
	const location = useLocation()

	const debouncedSearchQuery = useDebounce(searchQuery, 300)

	const filtered = contacts?.filter(
		c =>
			c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.username.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const shouldSearchGlobally = debouncedSearchQuery !== "" && filtered?.length === 0

	useEffect(() => {
		if (debouncedSearchQuery === "") {
			setFoundedUser(null)
			setIsSearching(false)
			return
		}

		if (!shouldSearchGlobally) {
			setFoundedUser(null)
			setIsSearching(false)
			return
		}

		setIsSearching(true)
		socket.send({ type: "search_user", username: debouncedSearchQuery })

		const unsub = socket.on("search_result", f => {
			setIsSearching(false)
			setFoundedUser(
				f.found
					? {
							username: f.username,
							displayName: f.displayName,
							userID: f.userID,
							publicKey: JSON.parse(f.publicKey),
						}
					: null
			)
		})

		return unsub
	}, [debouncedSearchQuery, shouldSearchGlobally, socket])

	const hasOutlet = location.pathname !== "/"
	const showGlobalSearch = shouldSearchGlobally || isSearching

	return (
		<div className="flex h-full w-full overflow-hidden bg-primary">
			<aside
				className={cn(
					"flex flex-col bg-sidebar-bg border-r border-border animate-fade-in shrink-0",
					hasOutlet ? "hidden md:flex" : "flex",
					"w-full md:w-80 lg:w-96"
				)}
			>
				<div className="flex h-16 items-center gap-3 px-5 border-b border-border">
					<div className="flex-1 min-w-0">
						<h1 className="font-bold text-xl text-primary-foreground truncate leading-tight">
							AnonChat
						</h1>
					</div>
					<div className="flex items-center gap-1">
						<SocketStatus />
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
							onClick={() => navigate({ to: "/settings" })}
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
					{filtered?.map(contact => (
						<ContactListItem key={contact.id} contact={contact} />
					))}

					{showGlobalSearch && (
						<>
							{isSearching && (
								<div className="flex items-center justify-center h-20 text-sm text-secondary-foreground animate-fade-in">
									Searching…
								</div>
							)}

							{!isSearching && foundedUser && <FoundUserCard user={foundedUser} />}

							{!isSearching && !foundedUser && shouldSearchGlobally && (
								<EmptyState searchQuery={debouncedSearchQuery} />
							)}
						</>
					)}

					{!searchQuery && filtered?.length === 0 && <EmptyState searchQuery="" />}
				</div>
			</aside>

			<main
				className={cn(
					"flex-1 flex flex-col overflow-hidden",
					!hasOutlet ? "hidden md:flex" : "flex"
				)}
			>
				<Outlet />
			</main>
		</div>
	)
}
