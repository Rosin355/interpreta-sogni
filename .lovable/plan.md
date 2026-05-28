# Rinomina globale + rimozione PWA install

## 1. Sostituzione "Dream Catcher" → "Dream Alchemist"

Trovati solo 2 riferimenti residui:

- `public/sw.js` (riga 101): titolo notifica push `'Dream Catcher 🌙'` → `'Dream Alchemist 🌙'`
- `src/components/NotificationManager.tsx` (riga 309): `"Aggiungi Dream Catcher alla schermata Home"` → testo rimosso insieme al blocco PWA (vedi sotto)

Il resto del codebase usa già "Dream Alchemist".

## 2. Rimozione UI di installazione PWA

Non esiste un componente `InstallPrompt` o un `beforeinstallprompt` handler nel progetto. Le tracce residue che invitano/abilitano l'installazione come PWA sono:

- **`src/components/NotificationManager.tsx`**: rimuovere l'`<Alert>` per utenti iOS/Safari (righe ~303–315) che istruisce ad "Aggiungere alla schermata Home". È l'unico invito in-app all'installazione.
- **`src/pages/Settings.tsx`**: rimuovere la nota residua "configurazione PWA è stata rimossa" (riga 170) — ora superflua.
- **`index.html`**: rimuovere le meta/link che abilitano la modalità standalone iOS e i relativi splash screen:
  - `<meta name="mobile-web-app-capable">`
  - `<meta name="apple-mobile-web-app-capable">`
  - `<meta name="apple-mobile-web-app-status-bar-style">`
  - `<meta name="apple-mobile-web-app-title">`
  - tutti i `<link rel="apple-touch-startup-image" ...>`
  - `<link rel="apple-touch-icon" href="/pwa-192x192.png">`
- **`public/sw.js`**: file orfano (nessuna registrazione nel client). Lo **sostituisco con un kill-switch service worker** che si auto-deregistra e pulisce le cache, per i pochi browser che potrebbero averlo registrato in passato (pattern raccomandato per rimuovere SW residui senza lasciare device bloccati).
- **`public/splash-screens/`** e `public/pwa-192x192.png`, `public/pwa-512x512.png`: rimossi (non più referenziati).

## 3. Cosa NON tocco

- `src/index.css` commento "PWA Safe Area Support" — è solo un commento per `env(safe-area-inset-*)`, utile anche fuori dalla PWA (notch iOS in Safari). Rinomino il commento in "Safe Area Support for iPhone Notch".
- `capacitor.config.ts` resta: serve per la futura app nativa iOS, non per PWA web.
- Toggle/logica notifiche locali in `NotificationManager.tsx` resta funzionante; rimuovo solo il blocco istruzioni "Add to Home Screen".

## Note tecniche

Il kill-switch SW in `public/sw.js`:
```js
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  await self.clients.claim();
  const names = await caches.keys();
  await Promise.all(names.map(n => caches.delete(n)));
  await self.registration.unregister();
})()));
```

Nessuna modifica a DB, edge functions, auth, routing o dipendenze.
