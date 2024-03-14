import { writable } from "svelte/store";

export const AppStateStore = writable({

    activation: false,
    initialized: false,
    error: '',
    livekit: false,

    networkSetupHint: false,
    networkSetup: false,
    setupButtonWatcher: false,
})