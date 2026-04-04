import { Copy, Reply } from "lucide-react"
import { Drawer } from "vaul"
import type { Message } from "@/types"

interface MessageActionDialogProps {
	message: Message
	open: boolean
	onOpenChange: (open: boolean) => void
	onCopy: () => void
	onReply: () => void
}

export function MessageActionDialog({
	message,
	open,
	onOpenChange,
	onCopy,
	onReply,
}: MessageActionDialogProps) {
	return (
		<Drawer.Root open={open} onOpenChange={onOpenChange}>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
				<Drawer.Content className="fixed right-0 bottom-0 left-0 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-3xl border-border border-t bg-primary">
					<div className="flex-1 overflow-y-auto">
						<div className="mx-auto mt-4 mb-6 h-1.5 w-12 shrink-0 rounded-full bg-tertiary" />

						<div className="space-y-2 px-4 pb-8">
							<button
								type="button"
								onClick={() => {
									onCopy()
									onOpenChange(false)
								}}
								className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-secondary active:bg-tertiary"
							>
								<Copy className="h-5 w-5 text-secondary-foreground" />
								<span className="font-medium text-primary-foreground text-sm">Copy Message</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onReply()
									onOpenChange(false)
								}}
								className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-secondary active:bg-tertiary"
							>
								<Reply className="h-5 w-5 text-secondary-foreground" />
								<span className="font-medium text-primary-foreground text-sm">Reply</span>
							</button>
						</div>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	)
}
