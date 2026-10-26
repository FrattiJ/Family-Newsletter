import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Article, NewArticle, Store, StoredPhoto } from "./types";
import { contentTypeFor, extensionFor } from "./types";

/**
 * Stores everything in a .data folder next to the code. This is what runs
 * when no Supabase keys are set, so the site works on your own computer with
 * no accounts or setup at all. Hosting providers wipe local files between
 * deploys, so the Supabase driver takes over once the site is live.
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

async function readArticles(): Promise<Article[]> {
  try {
    return JSON.parse(await readFile(ARTICLES_FILE, "utf8")) as Article[];
  } catch {
    return [];
  }
}

export const localStore: Store = {
  async listArticles() {
    const articles = await readArticles();
    return articles.filter((a) => !a.deletedAt).sort(sortNewestFirst);
  },

  async getArticle(id: string) {
    const articles = await readArticles();
    return articles.find((a) => a.id === id && !a.deletedAt) ?? null;
  },

  async deleteArticle(id: string) {
    const articles = await readArticles();
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    article.deletedAt = new Date().toISOString();
    await writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2), "utf8");
  },

  async createArticle(input: NewArticle) {
    await mkdir(DATA_DIR, { recursive: true });
    const articles = await readArticles();
    const article: Article = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    articles.push(article);
    await writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2), "utf8");
    return article;
  },

  async putPhoto(id: string, bytes: Buffer, contentType: string) {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const file = path.join(UPLOADS_DIR, `${id}.${extensionFor(contentType)}`);
    await writeFile(file, bytes);
  },

  async getPhoto(id: string): Promise<StoredPhoto | null> {
    // The extension is not stored on the article, so find the matching file.
    let entries: string[];
    try {
      entries = await readdir(UPLOADS_DIR);
    } catch {
      return null;
    }
    const match = entries.find((name) => name.startsWith(`${id}.`));
    if (!match) return null;

    const bytes = await readFile(path.join(UPLOADS_DIR, match));
    const extension = match.slice(match.lastIndexOf(".") + 1);
    return { bytes, contentType: contentTypeFor(extension) };
  },
};

export function sortNewestFirst(a: Article, b: Article): number {
  if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}
