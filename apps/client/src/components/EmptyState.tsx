import { UsersRound } from "lucide-react"

export function EmptyState({ searchQuery }: { searchQuery: string }) {
	return (
		<div className="flex h-80 animate-fade-in flex-col items-center justify-center gap-2 px-4 text-center text-secondary-foreground text-sm">
			<UsersRound size={30} className="mb-2" />
			{searchQuery ? (
				<>
					<p>No user found for "{searchQuery}".</p>
					<p className="text-xs opacity-70">Make sure you typed the exact username.</p>
				</>
			) : (
				<>
					<p>No contacts yet.</p>
					<p className="text-xs opacity-70">Enter a full username to send a request.</p>
				</>
			)}
		</div>
	)
}
