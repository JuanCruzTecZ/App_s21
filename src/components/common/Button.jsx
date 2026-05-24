export default function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}) {
  const variants = {
    primary: 'bg-accent-500 text-slate-950 hover:bg-accent-400',
    secondary: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
    ghost: 'text-accent-300 hover:text-accent-200',
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
