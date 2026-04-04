import { MessageCircle } from "lucide-react"

const NoActiveView = () => {
	return (
		<div className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-4 px-4 text-center">
			<MessageCircle className="h-16 w-16 text-muted opacity-30" />
			<div>
				<h2 className="font-semibold text-(--text-primary) text-lg">Select a conversation</h2>
				<p className="mt-1 text-(--text-secondary) text-sm">
					Choose a contact from the list to start chatting.
				</p>
			</div>
		</div>
	)
}

export default NoActiveView
