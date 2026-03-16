interface StatusIndicatorProps {
	isOnline: boolean;
	size?: "sm" | "md";
	className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
	isOnline,
	size = "sm",
	className = "",
}) => {
	const sizeClass = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
	return (
		<span
			className={`${sizeClass} ${className} rounded-full border-2 border-(--bg-primary) inline-block transition-colors duration-300`}
			style={{
				backgroundColor: isOnline ? "var(--online-color)" : "var(--text-muted)",
			}}
			// aria-label={isOnline ? "Online" : "Offline"}
		/>
	);
};
