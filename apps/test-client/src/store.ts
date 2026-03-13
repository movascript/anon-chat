import { create } from "zustand";
import type { KeyPair } from "./crypto";

export type AuthStatus =
	| "idle"
	| "connecting"
	| "authenticating"
	| "authenticated"
	| "error";

interface AuthState {
	status: AuthStatus;
	username: string | null;
	userID: string | null;
	error: string | null;
	keyPair: KeyPair | null;

	setStatus: (s: AuthStatus) => void;
	setAuthenticated: (username: string, userID: string) => void;
	setError: (msg: string) => void;
	setKeyPair: (kp: KeyPair) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	status: "idle",
	username: null,
	userID: null,
	error: null,
	keyPair: null,

	setStatus: (status) => set({ status, error: null }),
	setAuthenticated: (username, userID) =>
		set({ status: "authenticated", username, userID, error: null }),
	setError: (error) => set({ status: "error", error }),
	setKeyPair: (keyPair) => set({ keyPair }),
}));
