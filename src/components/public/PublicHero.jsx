export default function PublicHero({ tenant }) {
  return (
    <section className="glass-panel overflow-hidden rounded-[2rem]">
      <div className="grid-lines relative p-8 sm:p-12 lg:p-14">
        <div className="relative max-w-3xl">
          <p className="text-xs uppercase tracking-[0.35em] text-accent-300/80">
            Portal de asistencia especializada
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Consultorias digitales para {tenant.nombre || 'tu organizacion'}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Elegi una tecnologia, consulta sus materiales o solicita asistencia personalizada.
          </p>
        </div>
      </div>
    </section>
  );
}
