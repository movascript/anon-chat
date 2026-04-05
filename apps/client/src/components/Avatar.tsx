import type { UserID } from "@repo/types"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/className"

function generatColor(identifier: string): string {
	let hash = 0
	for (let i = 0; i < identifier.length; i++) {
		hash = identifier.charCodeAt(i) + ((hash << 5) - hash)
	}
	const hue = Math.abs(hash) % 360
	return `hsl(${hue}, 65%, 45%)`
}

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
	userId: UserID
	name: string
	className?: string
}

export function Avatar({ userId, name, size, className }: AvatarProps) {
	// Extract up to 2 initials from the name
	const initials = name
		.split(" ")
		.slice(0, 2)
		.map(w => w[0]?.toUpperCase() ?? "")
		.join("")

	const backgroundColor = generatColor(userId)

	return (
		<div className={cn(avatarVariants({ size }), className)} style={{ backgroundColor }}>
			{initials}
		</div>
	)
}
