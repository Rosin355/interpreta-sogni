Obiettivo: rendere ogni voce del menu mobile realmente tappabile al primo tocco, soprattutto “I Miei Sogni”, evitando che l’utente resti nella schermata del menu mentre la pagina sta caricando.

Piano di intervento:

1. Consolidare la navigazione del menu mobile autenticato
- Sostituire la sola navigazione tramite `<Link>` nel menu mobile con un handler esplicito `navigate(href)`.
- Chiudere il menu in modo controllato subito dopo aver avviato la navigazione.
- Gestire il caso in cui l’utente tocchi la voce della pagina corrente: chiudere comunque il menu, così non sembra bloccato.

2. Evitare conflitti tra overlay/menu/caricamento
- Verificare e correggere gli z-index: il menu mobile deve stare sopra l’overlay di cambio rotta finché riceve il tap.
- Dopo il tap, il menu deve chiudersi e lasciare visibile la pagina/skeleton di destinazione, non restare aperto.
- Mantenere l’overlay di debug delle aree touch, ma renderlo utile e non interferente (`pointer-events-none`).

3. Rendere il primo tap più reattivo
- Prefetch della route al `pointerdown`, ma navigazione effettiva su click/tap in modo deterministico.
- Per “I Miei Sogni”, assicurare che il caricamento dati della pagina mostri subito lo skeleton invece di far sembrare che il menu non abbia risposto.

4. Verifica mobile
- Testare su viewport mobile 390x844:
  - apri menu;
  - tap su “I Miei Sogni” dalla Dashboard;
  - conferma che l’URL diventi `/my-dreams` e che il menu si chiuda subito;
  - ripetere su almeno un’altra voce per controllare che non sia un fix isolato.