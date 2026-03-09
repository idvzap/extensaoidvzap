// Substituindo cliente Supabase por um mock ou null, já que não deve ser usado.
export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: { message: "Supabase removido. Use o backend próprio." } })
  }
};