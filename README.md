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
- cartella `sponsors/` con le immagini degli sponsor

## Anagrafica piste e piloti

Dall'icona a ingranaggio in alto si apre l'Anagrafica, con due sezioni:

- **Piste**: nome e lunghezza, con aggiungi/modifica/elimina. L'elenco a tendina in home le mostra in ordine alfabetico.
- **Piloti**: nome, cognome e numero, con aggiungi/modifica/elimina. Il pulsante "Aggiungi" nella schermata di cronometraggio apre la ricerca fra questi piloti archiviati.

Quando selezioni una pista viene mostrato il record assoluto registrato su quella pista; quando aggiungi alla sessione un pilota gia' presente in archivio, la sua card mostra subito il suo miglior tempo storico su quella pista.

## Banner sponsor

In fondo alla schermata scorre automaticamente un banner con i loghi degli sponsor. Le immagini sono file fissi nella cartella `sponsors/`: salva ogni logo con il nome esatto elencato qui sotto (formato PNG, meglio se con sfondo trasparente).

| File da salvare | Sponsor |
| --- | --- |
| `sponsors/sponsor-1.png` | Motoclub dello Stretto Messina |
| `sponsors/sponsor-2.png` | Romeo Motofficina |
| `sponsors/sponsor-3.png` | Romeo Suspension |
| `sponsors/sponsor-4.png` | Sicilia Enduro Tour |
| `sponsors/sponsor-5.png` | Villa Alba |
| `sponsors/sponsor-6.png` | Tabacchi Merlino |
| `sponsors/sponsor-7.png` | Desmoteam Catania |
| `sponsors/sponsor-8.png` | Lombardo Autoricambi |
| `sponsors/sponsor-9.png` | NellOttica |
| `sponsors/sponsor-10.png` | Scuola Guida Mariella |
| `sponsors/sponsor-11.png` | Amato Ingegneria |

Se in futuro cambi il numero o i nomi dei loghi, aggiorna l'elenco `SPONSOR_IMAGES` all'inizio di `app.js` (e `SPONSOR_FILES` in `sw.js`) di conseguenza.
