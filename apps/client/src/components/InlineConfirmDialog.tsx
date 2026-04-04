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
					className={`animate-fade-in overflow-hidden rounded-xl border bg-primary ${
						isDanger ? "border-red-200 dark:border-red-900" : "border-border"
					}`}
				>
					<div className="px-4 py-3.5">
						<div className="flex items-start gap-3">
							{icon && <div className="mt-0.5 shrink-0">{icon}</div>}
							<div className="min-w-0 flex-1">
								<p className="font-medium text-primary-foreground text-sm">{title}</p>
								{description && (
									<p className="mt-0.5 text-secondary-foreground text-xs">{description}</p>
								)}
							</div>
						</div>
					</div>
					<div className="flex border-border border-t">
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 py-3 font-medium text-secondary-foreground text-sm transition-all duration-200 hover:bg-secondary"
						>
							{cancelText}
						</button>
						<div className="w-px bg-border" />
						<button
							type="button"
							onClick={onConfirm}
							className={`flex-1 py-3 font-semibold text-sm transition-all duration-200 ${
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
