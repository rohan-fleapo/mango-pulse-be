/**
 * Supabase Database Types
 *
 * IMPORTANT: These types should be generated using the Supabase CLI.
 *
 * Generate types from remote database:
 *   npm run supabase:types
 *   (Requires SUPABASE_PROJECT_ID environment variable)
 *
 * Generate types from local Supabase:
 *   npm run supabase:types:local
 *   (Requires local Supabase to be running: npm run supabase:start)
 *
 * The generated types will be saved to: src/types/database.types.ts
 *
 * For now, we define manual types below. After running the migration,
 * regenerate types using the commands above.
 */

// =============================================================================
// MANUAL TYPES (use until you run supabase:types)
// =============================================================================

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  creator_id: string;
  tag_mango_id: string | null;
  role: 'member' | 'creator';
  created_at: string;
  updated_at: string;
}

export type InsertUser = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type UpdateUser = Partial<Omit<User, 'id' | 'created_at'>>;

// =============================================================================
// DATABASE TYPES (Supabase format)
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: InsertUser;
        Update: UpdateUser;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'member' | 'creator';
    };
  };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
