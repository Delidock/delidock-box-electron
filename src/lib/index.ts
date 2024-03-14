import { writable } from "svelte/store";

export const AppStateStore = writable({
    connected: false,
    activation: false,
    initialized: false,
    error: '',
    livekit: false,
    networkSetupHint: false,
    setupButtonWatcher: false
})