import { Globe, Instagram, Mail } from 'lucide-react';
import Button from '../common/Button';

export default function PublicHero({ tenant }) {
  return (
    <section className="glass-panel grid overflow-hidden rounded-[2rem] lg:grid-cols-[1.1fr_1fr]">
      <div className="grid-lines relative p-8 sm:p-12 lg:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-transparent" />
        <div className="relative max-w-xl">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-accent-300/80">
            Portal de asistencia especializada
          </p>
          <h1 className="max-w-lg text-5xl font-extrabold leading-[0.95] text-white sm:text-6xl">
            Servicio de Consultorias
          </h1>
          <p className="mt-6 max-w-md text-lg text-slate-300">
            Solicita asistencia en cualquiera de las tecnologias/apps listadas y recibi ayuda por parte de {tenant.nombre}.
          </p>
          

        </div>
      </div>

      <div className="relative flex flex-col justify-center gap-6 p-8 sm:p-12">
        {[
          'Google Sheets',
          'Google Forms',
          'Google Docs',
          'Google Meet',
          'Presentaciones',
          'Mentimeter',
          'Billeteras Digitales',
          'ChatGPT',
        ].map((item) => (
          <div key={item} className="section-line section-line-right py-4 text-right">
            <span className="text-xl font-medium text-slate-100 sm:text-2xl">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
