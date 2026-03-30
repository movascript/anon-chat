import { UsersRound } from "lucide-react";

export function EmptyState({ searchQuery }: { searchQuery: string }) {
	return (
		<div className="flex flex-col items-center justify-center text-secondary-foreground text-sm h-80 gap-2 text-center px-4 animate-fade-in">
			<UsersRound size={30} className="mb-2" />
			{searchQuery ? (
				<>
					<p>No user found for "{searchQuery}".</p>
					<p className="text-xs opacity-70">
						Make sure you typed the exact username.
					</p>
				</>
			) : (
				<>
					<p>No contacts yet.</p>
					<p className="text-xs opacity-70">
						Enter a full username to send a request.
					</p>
				</>
			)}
		</div>
	);
}
