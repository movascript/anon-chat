import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/className";

// todo: the avatar color should be deterministic by the user id

const avatarVariants = cva(
	"rounded-full flex items-center justify-center font-semibold text-white shrink-0",
	{
		variants: {
			size: {
				sm: "w-8 h-8 text-xs",
				md: "w-10 h-10 text-sm",
				lg: "w-14 h-14 text-xl",
				xl: "w-20 h-20 text-3xl",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

interface AvatarProps extends VariantProps<typeof avatarVariants> {
	name: string;
	color: string;
	className?: string;
}

export function Avatar({ name, color, size, className }: AvatarProps) {
	const initials = name
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");

	return (
		<div
			className={cn(avatarVariants({ size }), className)}
			style={{ backgroundColor: color }}
		>
			{initials}
		</div>
	);
}
