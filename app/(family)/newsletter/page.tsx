import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { formatLongDate, formatMonthHeading, monthKey } from "@/lib/dates";
import { store, type Article } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const articles = await store().listArticles();
  const [lead, ...rest] = articles;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <Masthead dateline={`Family Edition · ${today}`} />
      <div className="rule-double my-7" />

      {articles.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <LeadStory article={lead} />
          {rest.length > 0 ? <Archive articles={rest} /> : null}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-6 bg-paper border border-rule">
      <h2 className="font-display text-3xl font-bold mb-3">
        No news yet — and that&rsquo;s where you come in
      </h2>
      <p className="text-muted max-w-md mx-auto mb-8">
        Nobody has written anything yet. A birthday, a new job, a first tooth,
        a good dinner: it all counts as news around here.
      </p>
      <Link href="/write" className="btn btn-primary">
        Write the first story
      </Link>
    </div>
  );
}

function Byline({ article }: { article: Article }) {
  return (
    <div className="smallcaps text-accent">
      By {article.authorName}
      <span className="text-rule mx-2">|</span>
      <span className="text-muted">{formatLongDate(article.eventDate)}</span>
    </div>
  );
}

function Photo({ article, priority }: { article: Article; priority?: boolean }) {
  if (!article.photoId) return null;
  return (
    // A plain img: these photos are already shrunk in the browser before
    // upload, and they are served from a login-protected route that
    // next/image would not be able to optimise anyway.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/photo/${article.photoId}`}
      alt={`Photo for “${article.title}”`}
      loading={priority ? "eager" : "lazy"}
      className="w-full bg-rule border border-rule object-cover"
    />
  );
}

function Paragraphs({ body }: { body: string }) {
  return (
    <>
      {body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
    </>
  );
}

function LeadStory({ article }: { article: Article }) {
  return (
    <article>
      <div className="smallcaps text-accent mb-3">Latest Story</div>

      <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] mb-4">
        {article.title}
      </h2>

      <div className="pb-5 mb-6 border-b border-rule">
        <Byline article={article} />
      </div>

      {article.photoId ? (
        <figure className="mb-7">
          <Photo article={article} priority />
        </figure>
      ) : null}

      <div className="article-body article-body--lead text-[1.05rem] lg:columns-2 lg:gap-10">
        <Paragraphs body={article.body} />
      </div>
    </article>
  );
}

function Archive({ articles }: { articles: Article[] }) {
  // Articles arrive newest first, so walking them in order keeps months in order.
  const months: { key: string; label: string; articles: Article[] }[] = [];
  for (const article of articles) {
    const key = monthKey(article.eventDate);
    const current = months.at(-1);
    if (current?.key === key) current.articles.push(article);
    else
      months.push({
        key,
        label: formatMonthHeading(article.eventDate),
        articles: [article],
      });
  }

  return (
    <section className="mt-16">
      <div className="rule-double mb-10" />

      {months.map((month) => (
        <div key={month.key} className="mb-14">
          <h3 className="flex items-center gap-4 mb-8">
            <span className="h-px flex-1 bg-rule" />
            <span className="smallcaps text-muted">{month.label}</span>
            <span className="h-px flex-1 bg-rule" />
          </h3>

          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
            {month.articles.map((article) => (
              <article key={article.id} className="flex flex-col">
                {article.photoId ? (
                  <figure className="mb-4">
                    <Photo article={article} />
                  </figure>
                ) : null}

                <h4 className="font-display text-2xl font-bold leading-snug mb-2">
                  {article.title}
                </h4>

                <div className="pb-4 mb-4 border-b border-rule">
                  <Byline article={article} />
                </div>

                <div className="article-body text-[0.98rem]">
                  <Paragraphs body={article.body} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
