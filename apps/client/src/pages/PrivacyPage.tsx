import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
	const navigate = useNavigate();

	return (
		<div className="h-screen bg-primary animate-fade-in overflow-auto">
			<div className="container mx-auto px-6 py-8 max-w-4xl">
				<button
					type="button"
					onClick={() => navigate({ to: ".." })}
					className="flex items-center gap-2 text-secondary-foreground hover:text-primary-foreground mb-8 transition-colors"
				>
					<ArrowLeft className="w-5 h-5" />
					Back
				</button>

				<div className="space-y-8 text-secondary-foreground">
					<div>
						<h1 className="text-4xl font-bold text-primary-foreground mb-3">
							Privacy Policy
						</h1>
						<p className="text-sm text-muted">Last updated: March 18, 2026</p>
					</div>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Our Commitment to Privacy
						</h2>
						<p>
							AnonChat is built on the principle of privacy-first communication.
							We believe your conversations should remain yours alone. Our
							architecture is designed to ensure that even we cannot access your
							messages.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Zero-Knowledge Architecture
						</h2>
						<p className="mb-3">
							AnonChat uses WebSocket connections with end-to-end encryption.
							Our server acts purely as a relay, passing encrypted messages
							between users without ever having the ability to decrypt them.
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Messages are encrypted on your device before transmission</li>
							<li>The server only sees encrypted data it cannot read</li>
							<li>Decryption happens only on the recipient's device</li>
							<li>Encryption keys never leave your device</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							What We Don't Collect
						</h2>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>
								No message content - messages are never stored on our servers
							</li>
							<li>No phone numbers or email addresses required</li>
							<li>No tracking cookies or third-party analytics</li>
							<li>No conversation metadata or timestamps</li>
							<li>No IP address logging or user tracking</li>
							<li>No behavioral profiling or data mining</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							What We Temporarily Process
						</h2>
						<p className="mb-3">
							To facilitate message delivery, our relay server temporarily
							handles:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Encrypted message packets (unreadable to us)</li>
							<li>
								Routing information to deliver messages to the correct recipient
							</li>
							<li>Active connection status (online/offline)</li>
						</ul>
						<p className="mt-3">
							This data exists only in memory during transmission and is never
							written to disk or logged.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Data You Control
						</h2>
						<p className="mb-3">
							All persistent data is stored locally on your device using browser
							storage:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Your username and display name</li>
							<li>Your encryption keys</li>
							<li>Your contact list</li>
							<li>Complete message history</li>
							<li>App preferences and settings</li>
						</ul>
						<p className="mt-3">
							You have complete control over this data. Logging out or clearing
							browser storage permanently deletes everything. No account
							recovery is possible - this is by design.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Security & Encryption
						</h2>
						<p className="mb-3">
							AnonChat implements industry-standard end-to-end encryption:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>
								All messages are encrypted using modern cryptographic algorithms
							</li>
							<li>Each conversation uses unique encryption keys</li>
							<li>Forward secrecy ensures past messages remain secure</li>
							<li>Only you and your intended recipient can decrypt messages</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Open Source & Transparency
						</h2>
						<p className="mb-3">
							AnonChat is fully open source. Our code is publicly available for
							security audits and community review. You can:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Review our encryption implementation</li>
							<li>Verify our privacy claims</li>
							<li>Audit the server relay code</li>
							<li>Host your own private instance</li>
							<li>Contribute improvements to the project</li>
						</ul>
						<p className="mt-3">
							Visit our{" "}
							<a
								href="https://github.com/anonchat"
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent hover:underline"
							>
								GitHub repository
							</a>{" "}
							to explore the codebase.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Contributing
						</h2>
						<p className="mb-3">
							We welcome contributions from the community. You can help improve
							AnonChat by:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Reporting security vulnerabilities responsibly</li>
							<li>Submitting bug fixes and feature improvements</li>
							<li>Improving documentation and translations</li>
							<li>Conducting security audits</li>
							<li>Sharing feedback and suggestions</li>
						</ul>
						<p className="mt-3">
							Check our{" "}
							<a
								href="https://github.com/anonchat/CONTRIBUTING.md"
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent hover:underline"
							>
								contribution guidelines
							</a>{" "}
							to get started.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Third-Party Services
						</h2>
						<p>
							AnonChat does not integrate with any third-party analytics,
							advertising, or tracking services. We do not share data with
							external parties because we don't collect any data to share.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Your Rights
						</h2>
						<p className="mb-3">
							Since we don't collect or store personal data, traditional data
							rights (access, deletion, portability) don't apply in the
							conventional sense. However:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>You own all data stored on your device</li>
							<li>You can export your data at any time</li>
							<li>You can permanently delete everything by logging out</li>
							<li>No data remains on our servers after transmission</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Policy Updates
						</h2>
						<p>
							We may update this privacy policy to reflect changes in our
							practices or legal requirements. Any changes will be reflected in
							the "Last updated" date above. Continued use of AnonChat after
							updates constitutes acceptance of the revised policy.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold text-primary-foreground">
							Contact & Support
						</h2>
						<p className="mb-3">Questions about privacy or security?</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>
								Open an issue on our{" "}
								<a
									href="https://github.com/anonchat/issues"
									target="_blank"
									rel="noopener noreferrer"
									className="text-accent hover:underline"
								>
									GitHub repository
								</a>
							</li>
							<li>Join our community discussions</li>
							<li>
								Report security vulnerabilities to{" "}
								<a
									href="mailto:security@anonchat.example"
									className="text-accent hover:underline"
								>
									security@anonchat.example
								</a>
							</li>
						</ul>
					</section>

					<div className="pt-6 pb-12 border-t border-secondary-foreground/20">
						<p className="text-sm text-muted">
							AnonChat is committed to protecting your privacy through
							transparent practices and open-source technology. Your trust is
							our priority.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
