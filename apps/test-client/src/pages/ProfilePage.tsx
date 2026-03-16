import { Camera, ChevronRight, LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Avatar } from "../components/Avatar";
import { NavigationHeader } from "../components/NavigationHeader";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../store/appStore";

interface ToggleProps {
	checked: boolean;
	onChange: () => void;
	label: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		aria-label={label}
		onClick={onChange}
		className={`
      relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
      ${checked ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)]"}
    `}
	>
		<span
			className={`
        absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
        transition-transform duration-200
        ${checked ? "translate-x-5" : "translate-x-0"}
      `}
		/>
	</button>
);

export default function ProfilePage() {
	const { currentUser, logout, updateUserOnlineStatus } = useAppStore();
	const { isDark, toggleTheme } = useTheme();
	const navigate = useNavigate();

	const [isOnline, setIsOnline] = useState(true);
	const [notifications, setNotifications] = useState(true);
	const [readReceipts, setReadReceipts] = useState(true);
	const [lastSeenVisible, setLastSeenVisible] = useState(true);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	const user = currentUser ?? {
		name: "User",
		username: "user",
		avatarColor: "#3b82f6",
	};

	const handleOnlineToggle = () => {
		const next = !isOnline;
		setIsOnline(next);
		updateUserOnlineStatus(next);
	};

	const handleLogout = () => {
		logout();
		navigate("/login", { replace: true });
	};

	const SettingRow = ({
		label,
		sublabel,
		right,
		onClick,
	}: {
		label: string;
		sublabel?: string;
		right?: React.ReactNode;
		onClick?: () => void;
	}) => (
		<button
			type="button"
			onClick={onClick}
			className={`
        w-full flex items-center justify-between px-4 py-3.5
        hover:bg-[var(--bg-secondary)] active:bg-[var(--bg-tertiary)]
        transition-colors text-left
        ${!onClick ? "cursor-default" : ""}
      `}
		>
			<div>
				<p className="text-sm font-medium text-[var(--text-primary)]">
					{label}
				</p>
				{sublabel && (
					<p className="text-xs text-[var(--text-secondary)] mt-0.5">
						{sublabel}
					</p>
				)}
			</div>
			{right ??
				(onClick ? (
					<ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
				) : null)}
		</button>
	);

	const SectionHeader = ({ title }: { title: string }) => (
		<div className="px-4 pt-5 pb-1">
			<p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
				{title}
			</p>
		</div>
	);

	const Divider = () => <div className="h-px bg-[var(--border-color)] mx-4" />;

	return (
		<div className="flex flex-col h-full bg-[var(--bg-primary)]">
			<NavigationHeader
				title="Profile"
				showBack
				backTo="/"
				rightSlot={
					<button
						type="button"
						onClick={toggleTheme}
						className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
					>
						{isDark ? (
							<Sun className="w-4 h-4 text-[var(--text-secondary)]" />
						) : (
							<Moon className="w-4 h-4 text-[var(--text-secondary)]" />
						)}
					</button>
				}
			/>

			<div className="flex-1 overflow-y-auto">
				{/* ── Avatar card ────────────────────────────────────── */}
				<div className="flex flex-col items-center py-8 px-4 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
					<div className="relative">
						<Avatar name={user.name} color={user.avatarColor} size="xl" />
						<button
							type="button"
							className="
                absolute bottom-0 right-0 w-8 h-8 rounded-full
                bg-[var(--accent)] text-white flex items-center justify-center
                shadow-md hover:bg-[var(--accent-hover)] transition-colors
              "
							aria-label="Change avatar"
						>
							<Camera className="w-4 h-4" strokeWidth={2.5} />
						</button>
					</div>
					<h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
						{user.name}
					</h2>
					<p className="text-sm text-[var(--text-secondary)] mt-0.5">
						@{user.username}
					</p>

					{/* Online status pill */}
					<div className="flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)]">
						<span
							className="w-2 h-2 rounded-full"
							style={{
								backgroundColor: isOnline
									? "var(--online-color)"
									: "var(--text-muted)",
							}}
						/>
						<span className="text-xs font-medium text-[var(--text-secondary)]">
							{isOnline ? "Online" : "Offline"}
						</span>
					</div>
				</div>

				{/* ── Online status ───────────────────────────────────── */}
				<SectionHeader title="Status" />
				<div className="bg-[var(--bg-primary)] rounded-xl mx-3 overflow-hidden border border-[var(--border-color)]">
					<SettingRow
						label="Show as Online"
						sublabel="Let others see when you are active"
						right={
							<Toggle
								checked={isOnline}
								onChange={handleOnlineToggle}
								label="Online status"
							/>
						}
					/>
				</div>

				{/* ── Notifications ──────────────────────────────────── */}
				<SectionHeader title="Notifications" />
				<div className="bg-[var(--bg-primary)] rounded-xl mx-3 overflow-hidden border border-[var(--border-color)]">
					<SettingRow
						label="Push Notifications"
						sublabel="Receive message alerts"
						right={
							<Toggle
								checked={notifications}
								onChange={() => setNotifications(!notifications)}
								label="Notifications"
							/>
						}
					/>
					<Divider />
					<SettingRow label="Notification Sounds" onClick={() => {}} />
					<Divider />
					<SettingRow label="Do Not Disturb" onClick={() => {}} />
				</div>

				{/* ── Privacy ────────────────────────────────────────── */}
				<SectionHeader title="Privacy" />
				<div className="bg-[var(--bg-primary)] rounded-xl mx-3 overflow-hidden border border-[var(--border-color)]">
					<SettingRow
						label="Read Receipts"
						sublabel="Show when you have read messages"
						right={
							<Toggle
								checked={readReceipts}
								onChange={() => setReadReceipts(!readReceipts)}
								label="Read receipts"
							/>
						}
					/>
					<Divider />
					<SettingRow
						label="Last Seen"
						sublabel="Show last seen timestamp"
						right={
							<Toggle
								checked={lastSeenVisible}
								onChange={() => setLastSeenVisible(!lastSeenVisible)}
								label="Last seen"
							/>
						}
					/>
					<Divider />
					<SettingRow
						label="Blocked Users"
						sublabel="0 blocked"
						onClick={() => {}}
					/>
				</div>

				{/* ── Theme ──────────────────────────────────────────── */}
				<SectionHeader title="Appearance" />
				<div className="bg-[var(--bg-primary)] rounded-xl mx-3 overflow-hidden border border-[var(--border-color)]">
					<div className="px-4 py-3.5 flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-[var(--text-primary)]">
								Dark Mode
							</p>
							<p className="text-xs text-[var(--text-secondary)] mt-0.5">
								Switch interface theme
							</p>
						</div>
						<Toggle checked={isDark} onChange={toggleTheme} label="Dark mode" />
					</div>
					<Divider />
					<SettingRow label="Chat Wallpaper" onClick={() => {}} />
					<Divider />
					<SettingRow label="Font Size" sublabel="Medium" onClick={() => {}} />
				</div>

				{/* ── Logout ─────────────────────────────────────────── */}
				<div className="mx-3 mt-6 mb-8">
					{showLogoutConfirm ? (
						<div className="bg-[var(--bg-primary)] rounded-xl border border-red-200 dark:border-red-900 overflow-hidden">
							<div className="px-4 py-3.5">
								<p className="text-sm font-medium text-[var(--text-primary)]">
									Are you sure you want to logout?
								</p>
								<p className="text-xs text-[var(--text-secondary)] mt-0.5">
									You will need to choose a new username to sign back in.
								</p>
							</div>
							<div className="flex border-t border-[var(--border-color)]">
								<button
									type="button"
									onClick={() => setShowLogoutConfirm(false)}
									className="flex-1 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
								>
									Cancel
								</button>
								<div className="w-px bg-[var(--border-color)]" />
								<button
									type="button"
									onClick={handleLogout}
									className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
								>
									Logout
								</button>
							</div>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setShowLogoutConfirm(true)}
							className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 transition-colors"
						>
							<LogOut className="w-4 h-4" />
							Logout
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
