// Installing Tamani on the home screen (porteur, 2026-10-30). Browsers hide
// it in their menu, so Tamani shows its own button: Chrome and Edge hand over
// their install prompt (`beforeinstallprompt`), an iPhone has none and gets
// the Share-button steps. The head script keeps the prompt for the button
// from the first paint, and registers the service worker everywhere but the
// popup, where a respondent must never be offered the wholesaler's app.

export type InstallState = 'installed' | 'prompt' | 'ios' | 'none';

export function installState(env: {
  standalone: boolean;
  isIos: boolean;
  canPrompt: boolean;
}): InstallState {
  if (env.standalone) return 'installed';
  if (env.canPrompt) return 'prompt';
  if (env.isIos) return 'ios';
  return 'none';
}

export const INSTALL_COPY = {
  prompt: {
    label: "Installer l'application",
    note: "Tamani s'ouvre depuis ton écran d'accueil, comme une appli.",
  },
  ios: {
    label: 'Installer sur iPhone',
    note: "Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ».",
  },
} as const;

/** Fired on window when the kept prompt arrives or is used. */
export const INSTALL_EVENT = 'tamani-install';

export const INSTALL_SCRIPT = `try{var w=window;w.addEventListener('beforeinstallprompt',function(e){e.preventDefault();w.__tamaniInstall=e;w.dispatchEvent(new Event('${INSTALL_EVENT}'))});w.addEventListener('appinstalled',function(){w.__tamaniInstall=null;w.dispatchEvent(new Event('${INSTALL_EVENT}'))});if('serviceWorker' in navigator&&!/^\\/c\\//.test(location.pathname))w.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}catch(e){}`;
