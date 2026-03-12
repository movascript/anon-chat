import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import ThemeToggle from "#/components/ThemeToggle";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const navigate = useNavigate();
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateChat = () => {
		if (isCreating) return;

		setIsCreating(true);
		setTimeout(() => {
			navigate({ to: "/create" });
		}, 300);
	};

	return (
		<div className="max-w-xl flex flex-col justify-center items-center h-screen mx-auto text-center gap-10">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="space-y-4">
				<h1 className="text-5xl font-bold text-(--kicker)">Anon Chat</h1>
				<p className="text-xl text-gray-600">End-to-End encrypted messenger</p>
			</div>

			<button
				onClick={handleCreateChat}
				disabled={isCreating}
				className="py-3 text-xl px-6 cursor-pointer disabled:bg-gray-400 bg-(--kicker) rounded-xs hover:rounded-3xl rounded-tl-3xl rounded-br-3xl transition-all"
			>
				Start Chat
			</button>
		</div>
	);
}
