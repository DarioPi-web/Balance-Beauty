import "server-only";
import type { BankDetails } from "@/emails/types";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Datos bancarios para transferencias (store_settings "bank_transfer", público; se cargan en
 * /admin/integraciones). null si todavía no hay titular cargado o si la base no responde.
 */
export async function getBankDetails(): Promise<BankDetails | null> {
  try {
    const { data } = await createSupabasePublicClient()
      .from("store_settings")
      .select("value")
      .eq("key", "bank_transfer")
      .maybeSingle();
    const v = data?.value as Partial<BankDetails> | undefined;
    return v?.holder && (v.cbu || v.alias) ? (v as BankDetails) : null;
  } catch {
    return null;
  }
}
