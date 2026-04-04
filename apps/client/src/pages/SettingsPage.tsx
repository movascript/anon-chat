import { useNavigate } from "@tanstack/react-router"
import { Camera, ChevronRight, LogOut } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AppInfo } from "@/components/AppInfo"
import { Avatar } from "@/components/Avatar"
import { InlineConfirmDialog } from "@/components/InlineConfirmDialog"
import { NavigationHeader } from "@/components/NavigationHeader"
import { Toggle } from "@/components/Toggle"
import { useAppStore } from "@/store/appStore"
import { useTheme } from "@/store/theme"

function Divider() {
	return <div className="mx-4 h-px bg-border" />
}

function SectionHeader({ title }: { title: string }) {
	return (
		<div className="px-4 pt-5 pb-1.5">
			<p className="font-semibold text-accent text-xs uppercase tracking-wider">{title}</p>
		</div>
	)
}

interface SettingRowProps {
	label: string
	sublabel?: string
	right?: React.ReactNode
	onClick?: () => void
}

function SettingRow({ label, sublabel, right, onClick }: SettingRowProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!onClick}
			className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-all duration-200 hover:bg-secondary active:bg-tertiary disabled:cursor-default"
		>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-primary-foreground text-sm">{label}</p>
				{sublabel && <p className="mt-0.5 text-secondary-foreground text-xs">{sublabel}</p>}
			</div>
			{right ?? (onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted" />)}
		</button>
	)
}

export default function SettingsPage() {
	const identity = useAppStore(s => s.identity)
	const logout = useAppStore(s => s.logout)
	const updateUserOnlineStatus = useAppStore(s => s.updateUserOnlineStatus)
	const { isDark, toggleTheme } = useTheme()
	const navigate = useNavigate()

	const [isOnline, setIsOnline] = useState(true)
	const [notifications, setNotifications] = useState(true)
	const [readReceipts, setReadReceipts] = useState(true)
	const [lastSeenVisible, setLastSeenVisible] = useState(true)
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

	const user = identity ?? {
		displayName: "User",
		username: "user",
	}

	const handleOnlineToggle = () => {
		const next = !isOnline
		setIsOnline(next)
		updateUserOnlineStatus(next)
	}

	const handleLogout = () => {
		logout()
		navigate({ to: "/login", replace: true })
	}

	return (
		<div className="flex h-full animate-fade-in flex-col bg-primary">
			<NavigationHeader title="Settings" showBack backTo="/" />

			<div className="flex-1 overflow-y-auto">
				<div className="flex flex-col items-center border-border border-b bg-secondary px-4 py-8">
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
							className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-md transition-all duration-200 hover:bg-accent-hover active:scale-95"
							aria-label="Edit profile"
						>
							<Camera className="h-4 w-4" strokeWidth={2.5} />
						</button>
					</div>
					<h2 className="mt-4 font-bold text-primary-foreground text-xl">{user.displayName}</h2>
					<p className="mt-0.5 text-secondary-foreground text-sm">@{user.username}</p>
					<div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-primary px-4 py-1.5">
						<span
							className="h-2 w-2 rounded-full transition-colors duration-300"
							style={{
								backgroundColor: isOnline ? "#22c55e" : "#6b7280",
							}}
						/>
						<span className="font-medium text-secondary-foreground text-xs">
							{isOnline ? "Online" : "Offline"}
						</span>
					</div>
				</div>

				<SectionHeader title="Status" />
				<div className="mx-4 overflow-hidden rounded-xl border border-border bg-primary">
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
				<div className="mx-4 overflow-hidden rounded-xl border border-border bg-primary">
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
				<div className="mx-4 overflow-hidden rounded-xl border border-border bg-primary">
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
					<SettingRow label="Blocked Users" sublabel="Manage blocked contacts" onClick={() => {}} />
				</div>

				<SectionHeader title="Appearance" />
				<div className="mx-4 overflow-hidden rounded-xl border border-border bg-primary">
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
				<div className="mx-4 overflow-hidden rounded-xl border border-border bg-primary">
					<SettingRow label="Privacy Policy" onClick={() => navigate({ to: "/privacy" })} />
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
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 font-semibold text-red-500 text-sm transition-all duration-200 hover:bg-red-100 active:scale-[0.98] dark:bg-red-950/40 dark:hover:bg-red-950/60"
						>
							<LogOut className="h-4 w-4" />
							Logout
						</button>
					)}
				</div>

				<AppInfo />
			</div>
		</div>
	)
}
