
# Piano: Aggiungere Debug per Problema Sogni Utente

## Problema Identificato

L'utente con UUID `c4547d62-ee36-463d-8ce3-077310e2c6ac` (username: jessicaommarin) **ha 14 sogni nel database**, ma non riesce a vederli nel profilo/dashboard.

## Dati dal Database

| Campo | Valore |
|-------|--------|
| User ID | `c4547d62-ee36-463d-8ce3-077310e2c6ac` |
| Username | jessicaommarin |
| Numero sogni | 14 |
| RLS Policy | `auth.uid() = user_id` |

## Possibili Cause

1. **Mismatch autenticazione**: L'utente loggato potrebbe avere un `auth.uid()` diverso da quello atteso
2. **Token scaduto**: La sessione potrebbe essere scaduta ma l'UI non lo rileva
3. **Errore nella query**: La query potrebbe fallire silenziosamente
4. **RLS che blocca**: Le policy RLS potrebbero bloccare l'accesso

## Modifiche Proposte

### 1. Debug in `src/pages/Profile.tsx`

Aggiungere logging nella funzione `loadDreamStats()`:

```typescript
const loadDreamStats = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // DEBUG: Log autenticazione
    console.log('[Profile] DEBUG Auth:', {
      hasUser: !!user,
      userId: user?.id,
      expectedUserId: 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
      isMatch: user?.id === 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
      authError: authError?.message
    });
    
    if (!user) return;

    const { data: dreams, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', user.id);

    // DEBUG: Log query risultati
    console.log('[Profile] DEBUG Dreams Query:', {
      dreamsCount: dreams?.length || 0,
      error: error?.message,
      errorCode: error?.code,
      firstDream: dreams?.[0]?.title,
      queryUserId: user.id
    });

    // resto del codice...
  }
}
```

### 2. Debug in `src/pages/Dashboard.tsx`

Aggiungere logging nella funzione `fetchDreams()`:

```typescript
const fetchDreams = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // DEBUG: Log autenticazione
  console.log('[Dashboard] DEBUG Auth:', {
    hasUser: !!user,
    userId: user?.id,
    expectedUserId: 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
    isMatch: user?.id === 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
    authError: authError?.message
  });
  
  if (!user) return;

  const { data: allData, error } = await supabase
    .from("dreams")
    .select("*")
    .eq("user_id", user.id)
    .order("dream_date", { ascending: false });

  // DEBUG: Log query risultati
  console.log('[Dashboard] DEBUG Dreams Query:', {
    dreamsCount: allData?.length || 0,
    error: error?.message,
    errorCode: error?.code,
    errorDetails: error?.details,
    firstDreamTitle: allData?.[0]?.title,
    queryUserId: user.id
  });

  // resto del codice...
}
```

### 3. Debug in `src/pages/MyDreams.tsx`

Aggiungere logging nella funzione `fetchDreams()`:

```typescript
const fetchDreams = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // DEBUG: Log autenticazione
  console.log('[MyDreams] DEBUG Auth:', {
    hasUser: !!user,
    userId: user?.id,
    expectedUserId: 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
    isMatch: user?.id === 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
    authError: authError?.message
  });
  
  if (!user) return;

  const { data, error } = await supabase
    .from("dreams")
    .select("*")
    .eq("user_id", user.id)
    .order("dream_date", { ascending: false });

  // DEBUG: Log query risultati
  console.log('[MyDreams] DEBUG Dreams Query:', {
    dreamsCount: data?.length || 0,
    error: error?.message,
    errorCode: error?.code,
    errorDetails: error?.details,
    firstDreamTitle: data?.[0]?.title,
    queryUserId: user.id
  });

  // resto del codice...
}
```

## Output di Debug Atteso

Quando l'utente accede alle pagine, vedremo nella console:

```
[Dashboard] DEBUG Auth: {
  hasUser: true,
  userId: "xxx",
  expectedUserId: "c4547d62-ee36-463d-8ce3-077310e2c6ac",
  isMatch: false,  // <-- Questo ci dirà se c'è mismatch
  authError: null
}

[Dashboard] DEBUG Dreams Query: {
  dreamsCount: 0,
  error: null,
  queryUserId: "xxx"
}
```

## File da Modificare

| File | Funzione | Tipo Modifica |
|------|----------|---------------|
| `src/pages/Profile.tsx` | `loadDreamStats()` | Aggiunta console.log |
| `src/pages/Dashboard.tsx` | `fetchDreams()` | Aggiunta console.log |
| `src/pages/MyDreams.tsx` | `fetchDreams()` | Aggiunta console.log |

## Come Usare il Debug

1. Chiedere all'utente di accedere alla Dashboard o Profile
2. Aprire la Console del browser (F12 > Console)
3. Cercare i log con prefisso `[Dashboard]`, `[Profile]`, `[MyDreams]`
4. Verificare:
   - Se `userId` corrisponde a `c4547d62-ee36-463d-8ce3-077310e2c6ac`
   - Se ci sono errori nella query
   - Quanti sogni vengono restituiti

Questo ci permetterà di capire esattamente dove si verifica il problema.
