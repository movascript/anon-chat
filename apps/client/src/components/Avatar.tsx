import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/className"

// todo: the avatar color should be deterministic by the user id

const avatarVariants = cva(
	"flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
	{
		variants: {
			size: {
				sm: "h-8 w-8 text-xs",
				md: "h-10 w-10 text-sm",
				lg: "h-14 w-14 text-xl",
				xl: "h-20 w-20 text-3xl",
			},
		},
		defaultVariants: {
			size: "md",
		},
	}
)

interface AvatarProps extends VariantProps<typeof avatarVariants> {
	name: string
	color: string
	className?: string
}

export function Avatar({ name, color, size, className }: AvatarProps) {
	const initials = name
		.split(" ")
		.slice(0, 2)
		.map(w => w[0]?.toUpperCase() ?? "")
		.join("")

	return (
		<div className={cn(avatarVariants({ size }), className)} style={{ backgroundColor: color }}>
			{initials}
		</div>
	)
}
