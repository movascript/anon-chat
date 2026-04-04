import { MessageCircle } from "lucide-react"

const NoActiveView = () => {
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4 animate-fade-in">
			<MessageCircle className="w-16 h-16 text-muted opacity-30" />
			<div>
				<h2 className="text-lg font-semibold text-(--text-primary)">Select a conversation</h2>
				<p className="text-sm text-(--text-secondary) mt-1">
					Choose a contact from the list to start chatting.
				</p>
			</div>
		</div>
	)
}

export default NoActiveView
