## Piano di correzione

1. **Correggere il parser di `calculate-natal-chart`**
   - Leggere i pianeti da `chart_data.subject` invece che da `chart_data.planets`.
   - Estrarre le case da `chart_data.subject.first_house` → `twelfth_house` invece che da `chart_data.houses`.
   - Estrarre Ascendente e Medio Cielo da `subject.ascendant` e `subject.medium_coeli`.
   - Mappare gli aspetti usando i campi reali dell’API: `p1_name`, `p2_name`, `aspect`, `orbit`, `aspect_degrees`.

2. **Rendere il salvataggio più robusto**
   - Considerare valido il tema solo se contiene almeno i pianeti principali e 12 case.
   - Salvare anche `houseSystem` dal campo `houses_system_name` quando disponibile.
   - Evitare fallback silenziosi che generano temi incompleti o pagina vuota.

3. **Migliorare l’errore mostrato e loggato**
   - Se RapidAPI risponde ma cambia formato, restituire `UPSTREAM_UNAVAILABLE` con dettagli tecnici utili per admin/log.
   - Nel frontend, leggere il body dell’errore anche quando Supabase restituisce `FunctionsHttpError`, così non resta solo `INTERNAL_ERROR` generico.

4. **Verifica dopo deploy**
   - Deploy della Edge Function `calculate-natal-chart`.
   - Test diretto della funzione con dati equivalenti a quelli nello screenshot: 10/02/1983, 12:15, Roma.
   - Controllo che il profilo venga aggiornato con pianeti, case e riepilogo non vuoto.