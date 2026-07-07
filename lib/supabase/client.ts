// Mock Supabase server client for backward compatibility
export const createClient = () => ({
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null })
  }
});
