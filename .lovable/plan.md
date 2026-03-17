
Obiettivo: semplificare il “Viaggio Alchemico” ispirandoci all’infografica allegata, ma mantenendo il brand mistico dell’app e applicando il nuovo linguaggio visivo a tutto il sistema.

1. Direzione di redesign
- Passare da una visualizzazione “dashboard/card” a una struttura più editoriale e lineare.
- Tenere solo le 3 fasi attuali: Nigredo, Albedo, Rubedo.
- Mettere in primo piano:
  - fase corrente
  - percentuali
  - spiegazione sintetica per ogni fase
  - transizioni
- Ridurre animazioni e glow continui nella vista standard; lasciare la celebrazione solo come evento speciale.

2. Nuovo pattern UI proposto
Creerei un nuovo layout chiamabile, ad esempio, “AlchemicalJourneyTimeline”, con:
- header semplice: titolo + sottotitolo + fase attuale
- lista verticale di 3 step numerati
- per ogni step:
  - numero grande
  - nome fase + icona
  - breve testo descrittivo
  - percentuale utente
  - evidenza visiva se è la fase dominante
- sezione finale separata per “Transizioni recenti”

Schema:
```text
[ Titolo ]
[ fase attuale | trend ]

01 Nigredo
descrizione breve
43%

02 Albedo
descrizione breve
32%

03 Rubedo
descrizione breve
25%

[ Transizioni recenti ]
Nigredo → Albedo
Albedo → Rubedo
```

3. Dove intervenire
- `src/components/AlchemicalJourneyMap.tsx`
  - sostituire l’attuale griglia 3-card con il nuovo componente/lista verticale
  - mantenere props compatibili dove possibile (`currentPhase`, `distribution`, `compact`)
- `src/pages/Alchemy.tsx`
  - semplificare la hero iniziale
  - usare il nuovo journey layout come fulcro della pagina
  - ridurre peso visivo delle tabs attuali
  - trasformare “Le Tre Fasi” in contenuto più sintetico e leggibile
  - mantenere “Transizioni”, ma con una lista più pulita
- `src/pages/Dashboard.tsx`
  - aggiornare il widget compatto per usare la stessa grammatica visiva semplificata
- `src/components/AlchemicalBadge.tsx`
  - alleggerire il badge: meno gradienti/glow, più leggibilità editoriale
  - mantenere differenza cromatica tra le 3 fasi
- `src/pages/MyDreams.tsx` e `src/pages/Timeline.tsx`
  - allineare i badge e la terminologia al nuovo stile
  - evitare che il sistema appaia “vecchio” in alcune sezioni e “nuovo” in altre

4. Scelte di design consigliate
Dato che vuoi qualcosa “ispirato ma brandizzato”:
- sfondo: mantenere il dark mystic dell’app
- struttura: prendere dall’allegato la gerarchia verticale e la semplicità
- tipografia: numeri grandi, testi brevi, meno box annidati
- colori fase:
  - Nigredo: carbone / nero profondo
  - Albedo: perla / argento
  - Rubedo: rosso / ambra
- usare sottili linee divisorie e accenti glow solo sull’elemento attivo

5. Contenuti da accorciare
L’attuale pagina `/alchemy` ha molto testo lungo per fase. Per renderla più semplice:
- mostrare subito una descrizione breve
- spostare i dettagli lunghi in:
  - collapsible/accordion
  - oppure sezione secondaria “Approfondisci”
Così la pagina resta chiara già al primo colpo.

6. Impatto tecnico
- Nessun cambiamento al modello dati necessario
- Riutilizziamo:
  - `calculateUserJourney`
  - `getAllPhases`
  - `getPhaseAdvice`
  - `journey.transitions`
- Il lavoro è principalmente UI/refactor, non logica backend

7. Ordine di implementazione
- Step 1: ridisegnare `AlchemicalJourneyMap` in versione verticale semplice
- Step 2: aggiornare `/alchemy` per dare priorità al nuovo layout
- Step 3: adattare il riepilogo in Dashboard
- Step 4: uniformare `AlchemicalBadge` e gli altri punti del sistema
- Step 5: rifinire testi, spaziature, responsive mobile

8. Risultato atteso
Otterrai un’esperienza più chiara, elegante e coerente:
- più semplice da leggere
- più vicina al riferimento allegato
- meno “tecnica”
- più coerente in tutta l’app

9. Nota pratica
Ti consiglio di non replicare l’infografica 1:1 con 7 stadi, perché il tuo sistema oggi è costruito su 3 fasi. La soluzione migliore è usare il linguaggio visivo dell’allegato, ma adattato fedelmente al tuo modello Nigredo / Albedo / Rubedo.
