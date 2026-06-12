import Link from "next/link";

const FACTIONS = [
  { name: "Tuatha Dé Danann", sub: "Children of Danu", color: "#e6b833" },
  { name: "Fomóire", sub: "The Deep Ones", color: "#cc3333" },
  { name: "Aos Sí", sub: "The Hidden Folk", color: "#3fbf6f" },
  { name: "Sluagh", sub: "The Restless Dead", color: "#9b59d0" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 px-6 text-center">
      <p className="font-serif text-sm tracking-[0.5em] text-stone-500">LEBOR GABÁLA ÉRENN</p>
      <h1 className="mt-4 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 bg-clip-text font-serif text-7xl font-bold tracking-[0.15em] text-transparent sm:text-8xl">
        MAG TUIRED
      </h1>
      <p className="mt-4 font-serif text-xl italic text-stone-400">
        &ldquo;When Gods and Monsters Clashed for Ériu&rdquo;
      </p>

      <p className="mt-8 max-w-2xl leading-relaxed text-stone-300">
        A real-time strategy game of the Irish Mythological Cycle. Raise your dún, harvest
        gold and timber, summon heroes of legend, and march on the storied plain where the
        sovereignty of Ireland was won and lost. One battlefield. Two armies. No quarter.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FACTIONS.map(f => (
          <div key={f.name} className="rounded border border-stone-800 bg-stone-900/60 px-4 py-3">
            <div className="font-serif font-bold" style={{ color: f.color }}>{f.name}</div>
            <div className="text-xs italic text-stone-500">{f.sub}</div>
          </div>
        ))}
      </div>

      <Link
        href="/game"
        className="mt-12 rounded-lg border-2 border-amber-500 bg-gradient-to-b from-amber-700 to-amber-900 px-20 py-5 font-serif text-3xl font-bold tracking-[0.35em] text-amber-100 shadow-2xl shadow-amber-900/40 transition hover:from-amber-600 hover:to-amber-800"
      >
        PLAY
      </Link>

      <p className="mt-10 text-xs text-stone-600">
        1v1 vs AI · four asymmetric factions · heroes, creeps &amp; artifacts · day/night · fog of war
      </p>
    </div>
  );
}
