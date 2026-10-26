import { familyConfig } from "@/lib/config";

type Props = {
  /** Shown in the small type above the title, e.g. the current date. */
  dateline?: string;
  compact?: boolean;
};

export function Masthead({ dateline, compact = false }: Props) {
  const { newsletterName, tagline } = familyConfig();

  return (
    <header className="text-center">
      {dateline ? (
        <div className="smallcaps text-muted pb-3">{dateline}</div>
      ) : null}

      <h1
        className={`font-display font-black tracking-tight leading-[0.95] ${
          compact ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl md:text-7xl"
        }`}
      >
        {newsletterName}
      </h1>

      {tagline ? (
        <p className="font-display italic text-muted mt-3 text-lg">{tagline}</p>
      ) : null}
    </header>
  );
}
