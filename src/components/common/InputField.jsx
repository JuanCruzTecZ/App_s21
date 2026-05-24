export default function InputField({
  label,
  id,
  error,
  className = '',
  ...props
}) {
  return (
    <label className={`flex flex-col gap-2 text-sm text-slate-200 ${className}`} htmlFor={id}>
      <span className="font-medium text-slate-100">{label}</span>
      <input
        id={id}
        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-accent-400 focus:bg-white/[0.06]"
        {...props}
      />
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}
