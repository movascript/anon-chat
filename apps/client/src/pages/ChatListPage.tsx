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
					"flex shrink-0 animate-fade-in flex-col border-border border-r bg-sidebar-bg",
					hasOutlet ? "hidden md:flex" : "flex",
					"w-full md:w-80 lg:w-96"
				)}
			>
				<div className="flex h-16 items-center gap-3 border-border border-b px-5">
					<div className="min-w-0 flex-1">
						<h1 className="truncate font-bold text-primary-foreground text-xl leading-tight">
							AnonChat
						</h1>
					</div>
					<div className="flex items-center gap-1">
						<SocketStatus />
						<button
							type="button"
							onClick={toggleTheme}
							className="rounded-full p-2 transition-all duration-200 hover:bg-secondary active:bg-tertiary"
							aria-label="Toggle theme"
						>
							{isDark ? (
								<Sun className="h-4 w-4 text-secondary-foreground" />
							) : (
								<Moon className="h-4 w-4 text-secondary-foreground" />
							)}
						</button>
						<button
							type="button"
							onClick={() => navigate({ to: "/settings" })}
							className="rounded-full p-2 transition-all duration-200 hover:bg-secondary active:bg-tertiary"
							aria-label="Settings"
						>
							<Settings className="h-4 w-4 text-secondary-foreground" />
						</button>
					</div>
				</div>

				<div className="border-border border-b px-4 py-3">
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
								<div className="flex h-20 animate-fade-in items-center justify-center text-secondary-foreground text-sm">
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
					"flex flex-1 flex-col overflow-hidden",
					!hasOutlet ? "hidden md:flex" : "flex"
				)}
			>
				<Outlet />
			</main>
		</div>
	)
}
