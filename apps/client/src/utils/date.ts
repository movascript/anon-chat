function toDate(value: Date | number): Date {
	return value instanceof Date ? value : new Date(value);
}

export function formatLastSeen(date?: Date | number): string {
	if (!date) return "a long time ago";
	const d = toDate(date);

	const diff = Date.now() - d.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins} minutes ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs} hours ago`;
	return d.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

export function isSameDay(a: Date | number, b: Date | number): boolean {
	return toDate(a).toDateString() === toDate(b).toDateString();
}

export function formatDateSeparator(date: Date | number): string {
	const d = toDate(date);

	const now = new Date();
	if (isSameDay(d, now)) return "Today";
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (isSameDay(d, yesterday)) return "Yesterday";
	return d.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

export function formatTime(date?: Date | number | null): string {
	if (!date) return "";
	const d = toDate(date);

	const now = new Date();
	const diff = now.getTime() - d.getTime();
	const days = Math.floor(diff / 86400000);
	if (days === 0)
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	if (days === 1) return "Yesterday";
	if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
	return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
