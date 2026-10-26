import Link from "next/link";

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const sent = Number(single("sent") ?? "0");
  const wantedEmail = single("emailed") === "1";
  const savedToOutbox = single("outbox") === "1";
  const emailFailed = single("emailFailed") === "1";

  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center">
      <div className="smallcaps text-accent mb-4">Hot off the press</div>
      <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-5">
        Your story is published
      </h1>

      <p className="text-soft text-lg mb-8">
        {!wantedEmail
          ? "It's in the newsletter now. No email was sent, just as you asked."
          : emailFailed
            ? "It's safely in the newsletter, but the email did not go out."
            : savedToOutbox
              ? "It's in the newsletter. Email sending isn't switched on yet, so a copy was saved on this computer instead."
              : `It's in the newsletter, and ${sent} ${sent === 1 ? "person" : "people"} in the family just got an email about it.`}
      </p>

      {emailFailed ? (
        <p className="bg-accent/10 border border-accent text-accent px-4 py-3 mb-8 text-left">
          Nothing was lost — the story is saved. Whoever looks after the website
          should check the email settings.
        </p>
      ) : null}

      {savedToOutbox ? (
        <p className="bg-paper border border-rule px-4 py-3 mb-8 text-left text-muted text-sm">
          Saved to <code>.data/outbox</code>. Open the newest file there in a
          browser to see exactly what the family would have received.
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/newsletter" className="btn btn-primary">
          See it in the newsletter
        </Link>
        <Link href="/write" className="btn btn-secondary bg-paper">
          Write another story
        </Link>
      </div>
    </div>
  );
}
