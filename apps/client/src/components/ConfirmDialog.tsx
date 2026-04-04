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
				<Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
				<Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-3xl border-border border-t bg-primary">
					<div className="mx-auto mt-4 mb-6 h-1.5 w-12 shrink-0 rounded-full bg-tertiary" />

					<div className="px-6 pb-8">
						<h3 className="mb-2 font-semibold text-lg text-primary-foreground">{title}</h3>
						<p className="mb-6 text-secondary-foreground text-sm">{description}</p>

						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="flex-1 rounded-xl bg-secondary py-3 font-medium text-secondary-foreground text-sm transition-colors hover:bg-tertiary"
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
									"flex-1 rounded-xl py-3 font-semibold text-sm transition-colors",
									variant === "danger"
										? "bg-red-500 text-white hover:bg-red-600"
										: "bg-accent text-white hover:bg-accent-hover"
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
