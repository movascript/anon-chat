import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

interface NavigationHeaderProps {
	title: string;
	subtitle?: string;
	showBack?: boolean;
	backTo?: string;
	rightSlot?: React.ReactNode;
	leftSlot?: React.ReactNode;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
	title,
	subtitle,
	showBack = false,
	backTo,
	rightSlot,
	leftSlot,
}) => {
	const navigate = useNavigate();

	const handleBack = () => {
		if (backTo) navigate(backTo);
		else navigate(-1);
	};

	return (
		<header
			className="
        flex items-center gap-3 px-4 py-3
        bg-[var(--header-bg)] border-b border-[var(--border-color)]
        shadow-[var(--shadow)] z-10 shrink-0
      "
		>
			{showBack && (
				<button
					type="button"
					onClick={handleBack}
					className="p-1.5 -ml-1 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
					aria-label="Go back"
				>
					<ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
				</button>
			)}
			{leftSlot}
			<div className="flex-1 min-w-0">
				<h1 className="font-semibold text-base text-[var(--text-primary)] truncate leading-tight">
					{title}
				</h1>
				{subtitle && (
					<p className="text-xs text-[var(--text-secondary)] truncate leading-tight">
						{subtitle}
					</p>
				)}
			</div>
			{rightSlot && <div className="flex items-center gap-1">{rightSlot}</div>}
		</header>
	);
};
