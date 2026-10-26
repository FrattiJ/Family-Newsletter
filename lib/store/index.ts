import { usingSupabase } from "../config";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export type { Article, NewArticle, StoredPhoto } from "./types";

/**
 * Picks where articles and photos live. Supabase when its keys are set,
 * otherwise a .data folder on this machine.
 */
export function store(): Store {
  return usingSupabase() ? supabaseStore : localStore;
}
