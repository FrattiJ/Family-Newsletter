import { createClient } from "@supabase/supabase-js";
import { env } from "../config";
import type { Article, NewArticle, Store, StoredPhoto } from "./types";
import { extensionFor } from "./types";

const PHOTO_BUCKET = "article-photos";

type ArticleRow = {
  id: string;
  title: string;
  body: string;
  author_name: string;
  event_date: string;
  photo_ids: string[] | null;
  created_at: string;
  deleted_at: string | null;
};

function client() {
  // It is easy to paste the dashboard address from the browser bar instead of
  // the project's API address. That fails deep inside the client with an
  // unreadable "unexpected <!DOCTYPE" error, so catch it here and say so.
  const url = env.supabaseUrl;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/.test(url)) {
    throw new Error(
      `SUPABASE_URL does not look like a Supabase API address: "${url}". ` +
        `It should be the Project URL from Settings -> API, which looks like ` +
        `https://yourproject.supabase.co -- not the dashboard page you see ` +
        `in your browser.`,
    );
  }

  // The service role key bypasses row level security, which is what we want:
  // every request already passed the family password check before reaching
  // here, and the browser never talks to Supabase directly.
  return createClient(url, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    eventDate: row.event_date,
    photoIds: row.photo_ids ?? [],
    createdAt: row.created_at,
  };
}

export const supabaseStore: Store = {
  async listArticles() {
    const { data, error } = await client()
      .from("articles")
      .select("*")
      .is("deleted_at", null)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Could not load the newsletter: ${error.message}`);
    return (data as ArticleRow[]).map(toArticle);
  },

  async getArticle(id: string) {
    const { data, error } = await client()
      .from("articles")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(`Could not find that story: ${error.message}`);
    return data ? toArticle(data as ArticleRow) : null;
  },

  async deleteArticle(id: string) {
    const { error } = await client()
      .from("articles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(`Could not remove the story: ${error.message}`);
  },

  async createArticle(input: NewArticle) {
    const { data, error } = await client()
      .from("articles")
      .insert({
        title: input.title,
        body: input.body,
        author_name: input.authorName,
        event_date: input.eventDate,
        photo_ids: input.photoIds,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Could not save the story: ${error.message}`);
    return toArticle(data as ArticleRow);
  },

  async putPhoto(id: string, bytes: Buffer, contentType: string) {
    const { error } = await client()
      .storage.from(PHOTO_BUCKET)
      .upload(`${id}.${extensionFor(contentType)}`, bytes, {
        contentType,
        upsert: true,
      });

    if (error) throw new Error(`Could not save the photo: ${error.message}`);
  },

  async getPhoto(id: string): Promise<StoredPhoto | null> {
    const supabase = client();
    const { data: listing } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list("", { search: id });

    const match = listing?.find((item) => item.name.startsWith(`${id}.`));
    if (!match) return null;

    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .download(match.name);
    if (error || !data) return null;

    return {
      bytes: Buffer.from(await data.arrayBuffer()),
      contentType: data.type || "image/jpeg",
    };
  },
};
