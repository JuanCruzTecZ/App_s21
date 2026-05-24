export default function StatsCard({ label, value, helper }) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-4xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </article>
  );
}
