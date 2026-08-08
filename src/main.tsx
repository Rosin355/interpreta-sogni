// MUST be first: installs the auth refresh-token circuit breaker by wrapping
// the global fetch before the Supabase client (imported via App) is created, so
// the client captures the wrapped fetch. See refresh-circuit-breaker.ts.
import './integrations/supabase/refresh-circuit-breaker'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
