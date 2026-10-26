export type Article = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  /** The day the news happened, as YYYY-MM-DD. Drives the newspaper ordering. */
  eventDate: string;
  photoId: string | null;
  createdAt: string;
};

export type NewArticle = Omit<Article, "id" | "createdAt">;

export type StoredPhoto = {
  bytes: Buffer;
  contentType: string;
};

export type Store = {
  listArticles(): Promise<Article[]>;
  createArticle(input: NewArticle): Promise<Article>;
  putPhoto(id: string, bytes: Buffer, contentType: string): Promise<void>;
  getPhoto(id: string): Promise<StoredPhoto | null>;
};

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
