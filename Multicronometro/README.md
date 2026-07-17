# Simega #304

App cronometro manuale per piloti e piste motocross.

## Come usarla sul telefono

Non aprire la cartella direttamente dall'app File di iPhone: per funzionare bene deve essere aperta da un link web.

### Pubblicazione consigliata

1. Carica tutti i file della cartella su Netlify, Vercel o GitHub Pages.
2. Apri il link HTTPS da Safari su iPhone o Chrome su Android.
3. Su iPhone: Condividi > Aggiungi alla schermata Home.
4. Su Android: menu Chrome > Aggiungi a schermata Home oppure Installa app.

### Prova sulla stessa Wi-Fi

Se il PC e il telefono sono sulla stessa rete:

1. Avvia l'app sul PC.
2. Trova l'indirizzo IP del PC, ad esempio `192.168.1.25`.
3. Dal telefono apri `http://192.168.1.25:4174/index.html`.

`127.0.0.1` funziona solo sul PC, non dal telefono.

## File necessari

Carica sempre tutti questi file:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`
