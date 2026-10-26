import { ComposerForm } from "@/components/ComposerForm";
import { todayDateOnly } from "@/lib/dates";
import { requireFamilyMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const session = await requireFamilyMember();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <div className="smallcaps text-accent mb-3">Write a story</div>
      <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-3">
        What&rsquo;s the news?
      </h1>
      <p className="text-muted mb-10">
        Fill in as much as you like and press publish. Everything can be as
        short as a sentence.
      </p>

      <ComposerForm authorName={session.name} today={todayDateOnly()} />
    </div>
  );
}
