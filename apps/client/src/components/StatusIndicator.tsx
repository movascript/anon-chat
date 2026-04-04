import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/className"

const statusVariants = cva(
	"inline-block rounded-full border-2 border-primary transition-colors duration-300",
	{
		variants: {
			size: {
				sm: "h-2.5 w-2.5",
				md: "h-3.5 w-3.5",
			},
			isOnline: {
				true: "bg-[var(--online-color)]",
				false: "bg-[var(--text-muted)]",
			},
		},
		defaultVariants: {
			size: "sm",
			isOnline: false,
		},
	}
)

interface StatusIndicatorProps extends VariantProps<typeof statusVariants> {
	className?: string
}

export function StatusIndicator({ isOnline, size, className }: StatusIndicatorProps) {
	return <span className={cn(statusVariants({ size, isOnline }), className)} />
}
