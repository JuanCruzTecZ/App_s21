import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ConsultancyCard({ consultoria, ongSlug }) {
  return (
    <Link
      to={`/${ongSlug}/solicitud/${consultoria.id}`}
      className="group rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-accent-400/60 hover:bg-white/[0.06]"
    >
      <div className="section-line mb-5">
        <span className="text-xs uppercase tracking-[0.3em] text-accent-300/70">Consultoría</span>
      </div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="text-xl font-semibold text-white">{consultoria.titulo}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{consultoria.descripcion}</p>
        </div>
        <ArrowRight className="mt-1 shrink-0 text-accent-300 transition group-hover:translate-x-1" size={18} />
      </div>
    </Link>
  );
}
