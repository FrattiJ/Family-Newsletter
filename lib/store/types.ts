export type Article = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  /** The day the news happened, as YYYY-MM-DD. Drives the newspaper ordering. */
  eventDate: string;
  /** Up to MAX_PHOTOS photo ids, in the order they were chosen. */
  photoIds: string[];
  createdAt: string;
  /**
   * Set once a story has been taken down. It then disappears from the
   * newsletter, but the row is kept so a story removed by mistake can be
   * put back.
   */
  deletedAt?: string | null;
};

export type NewArticle = Omit<Article, "id" | "createdAt" | "deletedAt">;

export type StoredPhoto = {
  bytes: Buffer;
  contentType: string;
};

export type Store = {
  listArticles(): Promise<Article[]>;
  getArticle(id: string): Promise<Article | null>;
  createArticle(input: NewArticle): Promise<Article>;
  /** Marks a story as taken down. The row is kept so it can be restored. */
  deleteArticle(id: string): Promise<void>;
  putPhoto(id: string, bytes: Buffer, contentType: string): Promise<void>;
  getPhoto(id: string): Promise<StoredPhoto | null>;
};

/** Photos are cheap to store, but a story stays readable with only a few. */
export const MAX_PHOTOS = 3;

export const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionFor(contentType: string): string {
  return PHOTO_EXTENSIONS[contentType] ?? "jpg";
}

export function contentTypeFor(extension: string): string {
  const found = Object.entries(PHOTO_EXTENSIONS).find(
    ([, ext]) => ext === extension,
  );
  return found ? found[0] : "application/octet-stream";
}
