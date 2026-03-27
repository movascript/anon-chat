import { useNavigate } from "@tanstack/react-router";
import { Camera, ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppInfo } from "@/components/AppInfo";
import { Avatar } from "@/components/Avatar";
import { InlineConfirmDialog } from "@/components/InlineConfirmDialog";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Toggle } from "@/components/Toggle";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/appStore";

function Divider() {
	return <div className="h-px bg-border mx-4" />;
}

function SectionHeader({ title }: { title: string }) {
	return (
		<div className="px-4 pt-5 pb-1.5">
			<p className="text-xs font-semibold text-accent uppercase tracking-wider">
				{title}
			</p>
		</div>
	);
}

interface SettingRowProps {
	label: string;
	sublabel?: string;
	right?: React.ReactNode;
	onClick?: () => void;
}

function SettingRow({ label, sublabel, right, onClick }: SettingRowProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!onClick}
			className="w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 text-left disabled:cursor-default hover:bg-secondary active:bg-tertiary"
		>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium text-primary-foreground">{label}</p>
				{sublabel && (
					<p className="text-xs text-secondary-foreground mt-0.5">{sublabel}</p>
				)}
			</div>
			{right ??
				(onClick && <ChevronRight className="w-4 h-4 text-muted shrink-0" />)}
		</button>
	);
}

export default function SettingsPage() {
	const { identity, logout, updateUserOnlineStatus } = useAppStore();
	const { isDark, toggleTheme } = useTheme();
	const navigate = useNavigate();

	const [isOnline, setIsOnline] = useState(true);
	const [notifications, setNotifications] = useState(true);
	const [readReceipts, setReadReceipts] = useState(true);
	const [lastSeenVisible, setLastSeenVisible] = useState(true);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	const user = identity ?? {
		displayName: "User",
		username: "user",
	};

	const handleOnlineToggle = () => {
		const next = !isOnline;
		setIsOnline(next);
		updateUserOnlineStatus(next);
	};

	const handleLogout = () => {
		logout();
		navigate({ to: "/login", replace: true });
	};

	return (
		<div className="flex flex-col h-full animate-fade-in bg-primary">
			<NavigationHeader title="Settings" showBack backTo="/" />

			<div className="flex-1 overflow-y-auto">
				<div className="flex flex-col items-center py-8 px-4 bg-secondary border-b border-border">
					<div className="relative">
						<Avatar
							name={user.displayName}
							// color={user.avatarColor}
							color="#3b82f6" // ! should be changed
							size="xl"
						/>
						<button
							type="button"
							onClick={() => toast.info("Not Implemented")}
							className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-md hover:bg-accent-hover active:scale-95 transition-all duration-200"
							aria-label="Edit profile"
						>
							<Camera className="w-4 h-4" strokeWidth={2.5} />
						</button>
					</div>
					<h2 className="mt-4 text-xl font-bold text-primary-foreground">
						{user.displayName}
					</h2>
					<p className="text-sm text-secondary-foreground mt-0.5">
						@{user.username}
					</p>
					<div className="flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-primary border border-border">
						<span
							className="w-2 h-2 rounded-full transition-colors duration-300"
							style={{
								backgroundColor: isOnline ? "#22c55e" : "#6b7280",
							}}
						/>
						<span className="text-xs font-medium text-secondary-foreground">
							{isOnline ? "Online" : "Offline"}
						</span>
					</div>
				</div>

				<SectionHeader title="Status" />
				<div className="bg-primary rounded-xl mx-4 overflow-hidden border border-border">
					<SettingRow
						label="Show as Online"
						sublabel="Let others see when you are active"
						onClick={handleOnlineToggle}
						right={
							<Toggle
								checked={isOnline}
								onChange={handleOnlineToggle}
								label="Online status"
								size="md"
								buttonLess
							/>
						}
					/>
				</div>

				<SectionHeader title="Notifications" />
				<div className="bg-primary rounded-xl mx-4 overflow-hidden border border-border">
					<SettingRow
						label="Push Notifications"
						sublabel="Receive message alerts"
						onClick={() => setNotifications(!notifications)}
						right={
							<Toggle
								checked={notifications}
								onChange={() => setNotifications(!notifications)}
								label="Notifications"
								size="md"
								buttonLess
							/>
						}
					/>
					<Divider />
					<SettingRow label="Notification Sounds" onClick={() => {}} />
					<Divider />
					<SettingRow label="Do Not Disturb" onClick={() => {}} />
				</div>

				<SectionHeader title="Privacy" />
				<div className="bg-primary rounded-xl mx-4 overflow-hidden border border-border">
					<SettingRow
						label="Read Receipts"
						sublabel="Show when you have read messages"
						onClick={() => setReadReceipts(!readReceipts)}
						right={
							<Toggle
								checked={readReceipts}
								onChange={() => setReadReceipts(!readReceipts)}
								label="Read receipts"
								size="md"
								buttonLess
							/>
						}
					/>
					<Divider />
					<SettingRow
						label="Last Seen Visibility"
						sublabel="Show last seen timestamp to contacts"
						onClick={() => setLastSeenVisible(!lastSeenVisible)}
						right={
							<Toggle
								checked={lastSeenVisible}
								onChange={() => setLastSeenVisible(!lastSeenVisible)}
								label="Last seen visibility"
								size="md"
								buttonLess
							/>
						}
					/>
					<Divider />
					<SettingRow
						label="Blocked Users"
						sublabel="Manage blocked contacts"
						onClick={() => {}}
					/>
				</div>

				<SectionHeader title="Appearance" />
				<div className="bg-primary rounded-xl mx-4 overflow-hidden border border-border">
					<SettingRow
						label="Dark Mode"
						sublabel="Switch between light and dark themes"
						onClick={toggleTheme}
						right={
							<Toggle
								checked={isDark}
								onChange={toggleTheme}
								label="Dark mode"
								size="md"
								buttonLess
							/>
						}
					/>
				</div>

				<SectionHeader title="About" />
				<div className="bg-primary rounded-xl mx-4 overflow-hidden border border-border">
					<SettingRow
						label="Privacy Policy"
						onClick={() => navigate({ to: "/privacy" })}
					/>
				</div>

				<div className="mx-4 mt-5 mb-8">
					<InlineConfirmDialog
						show={showLogoutConfirm}
						title="Are you sure you want to logout?"
						description="You cant log back in and you  will loose your identity!"
						confirmText="Logout"
						cancelText="Cancel"
						onConfirm={handleLogout}
						onCancel={() => setShowLogoutConfirm(false)}
						variant="danger"
					/>

					{!showLogoutConfirm && (
						<button
							type="button"
							onClick={() => setShowLogoutConfirm(true)}
							className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 active:scale-[0.98] transition-all duration-200"
						>
							<LogOut className="w-4 h-4" />
							Logout
						</button>
					)}
				</div>

				<AppInfo />
			</div>
		</div>
	);
}
