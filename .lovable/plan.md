

# Semplificazione Visualizzazione Viaggio Alchemico

## Cosa cambia

Sostituire la mappa visuale con cerchi animati (`AlchemicalJourneyMap`) con una visualizzazione testuale/card semplice che mostra:

- La fase corrente con badge colorato e percentuale
- Una barra di progresso orizzontale con i tre colori (nero, bianco, rosso) proporzionali alla distribuzione
- Le tre fasi in una riga con percentuali, evidenziando quella corrente

## Dettaglio tecnico

### File: `src/components/AlchemicalJourneyMap.tsx`
Riscrivere il componente rimuovendo:
- I cerchi animati con glow e shadow pulsanti
- Le tooltip complesse
- Le animazioni framer-motion pesanti

Sostituendo con:
- Tre card/badge in riga orizzontale con nome fase, icona e percentuale
- Una barra di progresso segmentata (nero | bianco | rosso) proporzionale alla distribuzione
- Indicatore "Fase attuale" semplice con testo e badge
- Mantenere la modalita `compact` per Dashboard

### File: `src/pages/Alchemy.tsx`
- Rimuovere i grafici Recharts (AreaChart e LineChart) dal tab "Grafici"
- Semplificare i tab: mantenere solo "Le Tre Fasi" e "Transizioni"
- Rimuovere import di Recharts non necessari

## Risultato
Una pagina piu leggera, leggibile e meno pesante graficamente, che comunica le stesse informazioni in modo chiaro e diretto.

