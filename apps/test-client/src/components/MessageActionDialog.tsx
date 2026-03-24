import { Copy, Reply } from "lucide-react";
import { Drawer } from "vaul";
import type { Message } from "@/types";

interface MessageActionDialogProps {
	message: Message;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCopy: () => void;
	onReply: () => void;
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
				<Drawer.Content className="fixed bottom-0 left-0 right-0 flex flex-col rounded-t-3xl bg-primary border-t border-border max-h-[85vh] mx-auto max-w-md">
					<div className="flex-1 overflow-y-auto">
						<div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-tertiary mt-4 mb-6" />

						<div className="px-4 pb-8 space-y-2">
							<button
								type="button"
								onClick={() => {
									onCopy();
									onOpenChange(false);
								}}
								className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary active:bg-tertiary transition-colors"
							>
								<Copy className="w-5 h-5 text-secondary-foreground" />
								<span className="text-sm font-medium text-primary-foreground">
									Copy Message
								</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onReply();
									onOpenChange(false);
								}}
								className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary active:bg-tertiary transition-colors"
							>
								<Reply className="w-5 h-5 text-secondary-foreground" />
								<span className="text-sm font-medium text-primary-foreground">
									Reply
								</span>
							</button>
						</div>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
