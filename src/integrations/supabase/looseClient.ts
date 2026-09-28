// Loose-typed re-export of the generated Supabase client.
// Used by legacy modules whose tables are not present in the current
// generated Database type. Prefer the strict `client` import in new code.
import { supabase as typedClient } from "./client";

export const supabase = typedClient as any;
