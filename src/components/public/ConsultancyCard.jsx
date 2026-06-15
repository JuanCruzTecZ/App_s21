import { FileText, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';

export default function ConsultancyCard({ consultoria, ongSlug }) {
  return (
    <article className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:border-accent-400/50 hover:bg-white/[0.05]">
      <div className="section-line mb-5">
        <span className="text-xs uppercase tracking-[0.3em] text-accent-300/70">Consultoria</span>
      </div>
      <h3 className="text-xl font-semibold text-white">{consultoria.titulo}</h3>
      <p className="mt-3 min-h-16 text-sm leading-6 text-slate-300">{consultoria.descripcion}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/${ongSlug}/materiales/${consultoria.id}`}>
          <Button type="button" variant="secondary" className="gap-2">
            <FileText size={17} />
            Consultar materiales
          </Button>
        </Link>
        <Link to={`/${ongSlug}/solicitud/${consultoria.id}`}>
          <Button type="button" className="gap-2">
            <Send size={17} />
            Solicitar asistencia
          </Button>
        </Link>
      </div>
    </article>
  );
}
