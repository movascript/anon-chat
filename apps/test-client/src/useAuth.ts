// Orchestrates the full connect → challenge → sign → auth flow.

import { useEffect, useRef } from "react";
import { getOrCreateKeyPair, signNonce } from "./crypto";
import { useAuthStore } from "./store";
import { socket } from "./ws";

export function useAuth() {
	const { setStatus, setAuthenticated, setError, setKeyPair, keyPair, status } =
		useAuthStore();
	const pendingUsername = useRef<string | null>(null);

	// Load/generate keypair on mount
	useEffect(() => {
		getOrCreateKeyPair().then((kp) => {
			setKeyPair(kp);
		});
	}, [setKeyPair]);

	// Wire up server frame handlers once
	useEffect(() => {
		const offChallenge = socket.on("challenge", async (frame) => {
			const nonce = frame.nonce as string;
			const username = pendingUsername.current;
			const kp = useAuthStore.getState().keyPair;

			if (!username || !kp) return;

			setStatus("authenticating");

			const signature = await signNonce(kp.privateKey, nonce);

			socket.send({
				type: "auth",
				id: crypto.randomUUID(),
				ts: Date.now(),
				username,
				publicKey: kp.publicKeyJwk,
				signature,
			});
		});

		const offSuccess = socket.on("auth_success", (frame) => {
			setAuthenticated(frame.username as string, frame.userID as string);
		});

		const offError = socket.on("auth_error", (frame) => {
			setError(frame.reason as string);
			socket.disconnect();
		});

		return () => {
			offChallenge();
			offSuccess();
			offError();
		};
	}, [setStatus, setAuthenticated, setError]);

	function login(username: string) {
		if (!keyPair) return;
		pendingUsername.current = username;
		setStatus("connecting");
		socket.connect();
	}

	return { login, status };
}
