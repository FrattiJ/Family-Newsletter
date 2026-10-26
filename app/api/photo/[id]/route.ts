import type { NextRequest } from "next/server";
import { getSession, photoTokenValid } from "@/lib/session";
import { store } from "@/lib/store";

/**
 * Serves a story photo. Readable either by a logged-in family member or with
 * the photo's own token, which is what the emailed copies carry since an
 * email client cannot send our login cookie.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("t");
  const allowed = photoTokenValid(id, token) || (await getSession()) !== null;
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }

  const photo = await store().getPhoto(id);
  if (!photo) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      // Each photo has its own permanent id, so it can be cached hard.
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(photo.bytes.byteLength),
    },
  });
}
