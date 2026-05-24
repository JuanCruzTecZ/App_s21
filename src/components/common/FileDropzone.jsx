import { Paperclip } from 'lucide-react';

export default function FileDropzone({ files, onChange }) {
  return (
    <label className="flex cursor-pointer flex-col rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm text-slate-300 transition hover:border-accent-400/60 hover:bg-white/[0.05]">
      <div className="flex items-center gap-3 text-slate-100">
        <Paperclip size={18} />
        <span className="font-medium">Adjuntar archivos de apoyo</span>
      </div>
      <span className="mt-2 text-sm text-slate-400">PDF, capturas o documentos relevantes para acelerar la asistencia.</span>
      <input
        className="hidden"
        type="file"
        multiple
        onChange={(event) => onChange(Array.from(event.target.files || []))}
      />
      {files.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file) => (
            <span key={`${file.name}-${file.size}`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
              {file.name}
            </span>
          ))}
        </div>
      ) : null}
    </label>
  );
}
