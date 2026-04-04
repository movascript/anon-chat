import type { ReactNode } from "react"

interface InlineConfirmDialogProps {
	show: boolean
	title: string
	description?: string
	confirmText?: string
	cancelText?: string
	onConfirm: () => void
	onCancel: () => void
	variant?: "default" | "danger"
	icon?: ReactNode
	className?: string
}

export function InlineConfirmDialog({
	show,
	title,
	description,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	variant = "default",
	icon,
	className = "",
}: InlineConfirmDialogProps) {
	const isDanger = variant === "danger"

	return (
		<div className={className}>
			{show ? (
				<div
					className={`bg-primary rounded-xl border overflow-hidden animate-fade-in ${
						isDanger ? "border-red-200 dark:border-red-900" : "border-border"
					}`}
				>
					<div className="px-4 py-3.5">
						<div className="flex items-start gap-3">
							{icon && <div className="shrink-0 mt-0.5">{icon}</div>}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-primary-foreground">{title}</p>
								{description && (
									<p className="text-xs text-secondary-foreground mt-0.5">{description}</p>
								)}
							</div>
						</div>
					</div>
					<div className="flex border-t border-border">
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 py-3 text-sm font-medium text-secondary-foreground hover:bg-secondary transition-all duration-200"
						>
							{cancelText}
						</button>
						<div className="w-px bg-border" />
						<button
							type="button"
							onClick={onConfirm}
							className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 ${
								isDanger
									? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
									: "text-accent hover:bg-secondary"
							}`}
						>
							{confirmText}
						</button>
					</div>
				</div>
			) : null}
		</div>
	)
}
