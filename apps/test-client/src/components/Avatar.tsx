interface AvatarProps {
	name: string;
	color: string;
	size?: "sm" | "md" | "lg" | "xl";
	className?: string;
}

const sizeMap = {
	sm: { outer: "w-8 h-8", text: "text-xs" },
	md: { outer: "w-10 h-10", text: "text-sm" },
	lg: { outer: "w-14 h-14", text: "text-xl" },
	xl: { outer: "w-20 h-20", text: "text-3xl" },
};

export const Avatar: React.FC<AvatarProps> = ({
	name,
	color,
	size = "md",
	className = "",
}) => {
	const initials = name
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");

	const { outer, text } = sizeMap[size];

	return (
		<div
			className={`${outer} ${text} ${className} rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none`}
			style={{ backgroundColor: color }}
		>
			{initials}
		</div>
	);
};
