const DEMO_KEY = 'siergar-demo-mode';
const DEMO_EVENT = 'siergar-demo-mode-change';

export const demoMode = {
    get enabled() {
        return localStorage.getItem(DEMO_KEY) === 'true';
    },
    enable() { this._set(true); },
    disable() { this._set(false); },
    toggle() { this._set(!this.enabled); },
    _set(val) {
        localStorage.setItem(DEMO_KEY, String(val));
        window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: { enabled: val } }));
        // On disable: reload to wipe any fake data accumulated during demo mode
        if (!val) {
            setTimeout(() => window.location.reload(), 80);
        }
    },
    subscribe(fn) {
        const handler = (e) => fn(e.detail.enabled);
        window.addEventListener(DEMO_EVENT, handler);
        return () => window.removeEventListener(DEMO_EVENT, handler);
    },
};
