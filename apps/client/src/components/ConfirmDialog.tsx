import { Drawer } from "vaul"
import { cn } from "@/utils/className"

interface ConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	confirmText: string
	cancelText?: string
	onConfirm: () => void
	variant?: "danger" | "default"
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText,
	cancelText = "Cancel",
	onConfirm,
	variant = "default",
}: ConfirmDialogProps) {
	return (
		<Drawer.Root open={open} onOpenChange={onOpenChange}>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
				<Drawer.Content className="fixed bottom-0 left-0 right-0 flex flex-col rounded-t-3xl bg-primary border-t border-border max-h-[85vh] mx-auto max-w-md z-50">
					<div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-tertiary mt-4 mb-6" />

					<div className="px-6 pb-8">
						<h3 className="text-lg font-semibold text-primary-foreground mb-2">{title}</h3>
						<p className="text-sm text-secondary-foreground mb-6">{description}</p>

						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="flex-1 py-3 rounded-xl text-sm font-medium text-secondary-foreground bg-secondary hover:bg-tertiary transition-colors"
							>
								{cancelText}
							</button>
							<button
								type="button"
								onClick={() => {
									onConfirm()
									onOpenChange(false)
								}}
								className={cn(
									"flex-1 py-3 rounded-xl text-sm font-semibold transition-colors",
									variant === "danger"
										? "bg-red-500 hover:bg-red-600 text-white"
										: "bg-accent hover:bg-accent-hover text-white"
								)}
							>
								{confirmText}
							</button>
						</div>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	)
}
