import { NamePicker } from "@/components/NamePicker";
import { Masthead } from "@/components/Masthead";
import { familyNames } from "@/lib/config";

export default function WhoPage() {
  const names = familyNames();

  return (
    <main className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-xl">
        <Masthead compact />
        <div className="rule-double my-8" />

        <div className="bg-paper border border-rule p-7 sm:p-9">
          <h2 className="font-display text-2xl font-bold mb-1">
            Who&rsquo;s here today?
          </h2>
          <p className="text-muted mb-7">
            Tap your name. We only use it to sign your stories, the way a
            newspaper prints the reporter&rsquo;s name.
          </p>

          <NamePicker names={names} />

          <p className="text-muted text-sm mt-7 pt-5 border-t border-rule">
            Name missing? Ask whoever looks after the website to add you to the
            family list.
          </p>
        </div>
      </div>
    </main>
  );
}
