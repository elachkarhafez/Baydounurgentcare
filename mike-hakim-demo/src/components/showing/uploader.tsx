"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, FileText, FileUp, ImageIcon, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UPLOAD_LIMITS } from "@/config/demo";
import type { DocumentMeta } from "@/lib/types";
import { bytes } from "@/lib/format";
import { cn } from "cn";

/**
 * PRIVACY: this is a public demo. The selected File is read for its name,
 * type and size only, then dropped. The bytes are never read, uploaded or
 * persisted. Only the metadata goes into the request.
 */
export function validateFile(f: { name: string; type: string; size: number }): { ok: true; meta: DocumentMeta } | { ok: false; error: string } {
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  const label = UPLOAD_LIMITS.types[f.type] ?? (ext === "pdf" ? "PDF" : ext === "png" ? "PNG" : ext === "jpg" || ext === "jpeg" ? "JPG" : null);
  if (!UPLOAD_LIMITS.extensions.includes(ext) || !label) return { ok: false, error: "That file type isn't supported. Use a PDF, JPG or PNG." };
  if (f.type && !UPLOAD_LIMITS.types[f.type]) return { ok: false, error: "That file type isn't supported. Use a PDF, JPG or PNG." };
  if (f.size === 0) return { ok: false, error: "That file looks empty. Try another one." };
  if (f.size > UPLOAD_LIMITS.maxBytes) return { ok: false, error: `That file is ${bytes(f.size)}. The limit is 10 MB.` };
  return { ok: true, meta: { name: f.name.slice(0, 200), type: label as DocumentMeta["type"], size: f.size } };
}

export const SAMPLE_DOC: DocumentMeta = { name: "sample-preapproval-letter.pdf", type: "PDF", size: 184_320 };

export function Uploader({ value, onChange, onSkip, skipped, error, sampleSignal }: { value: DocumentMeta | null; onChange: (m: DocumentMeta | null) => void; onSkip?: () => void; skipped?: boolean; error?: string; sampleSignal?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const accept = useCallback((meta: DocumentMeta) => {
    const onChange = (m: DocumentMeta | null) => onChangeRef.current(m);
    setErr(null);
    onChange(null);
    setProgress(0);
    if (timer.current) clearInterval(timer.current);
    let p = 0;
    timer.current = setInterval(() => {
      p = Math.min(100, p + 9 + Math.random() * 14);
      setProgress(p);
      if (p >= 100) { clearInterval(timer.current!); setTimeout(() => { setProgress(null); onChange(meta); }, 250); }
    }, 90);
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => { if (sampleSignal) accept(SAMPLE_DOC); }, [sampleSignal, accept]); // accept is stable

  const handle = (file: File | undefined | null) => {
    if (!file) return;
    const r = validateFile({ name: file.name, type: file.type, size: file.size });
    if (input.current) input.current.value = ""; // release the File reference
    if (!r.ok) { setErr(r.error); return; }
    accept(r.meta);
  };

  const Icon = value?.type === "PDF" ? FileText : ImageIcon;
  return (
    <div className="grid gap-3">
      <p className="flex items-start gap-2 text-[12px] leading-snug text-[#6b5126]" role="note">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>Demo only — please use a sample document, not your actual pre-approval letter.</span>
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {value ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-lg border border-emerald/30 bg-emerald/5 p-4" data-testid="doc-selected">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-card text-emerald hairline"><Icon className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold">{value.name}</p>
              <p className="text-[12.5px] text-muted-foreground">{value.type} · {bytes(value.size)} · <span className="inline-flex items-center gap-1 text-emerald"><CheckCircle2 className="size-3.5" /> Attached (metadata only)</span></p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => input.current?.click()} aria-label="Replace document"><RefreshCw /></Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label="Remove document"><Trash2 /></Button>
            </div>
          </motion.div>
        ) : progress !== null ? (
          <motion.div key="prog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-lg border bg-card p-5">
            <p className="text-[14px] font-semibold">Checking file…</p>
            <Progress value={progress} className="mt-3" aria-label="Upload progress (simulated)" />
            <p className="mt-2 text-[12px] text-muted-foreground">Simulated progress. Nothing is being uploaded.</p>
          </motion.div>
        ) : (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
            className={cn("grid place-items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors", drag ? "border-gold bg-gold/10" : "border-border bg-card hover:border-gold/60", (err || error) && "border-destructive/60")}
            data-tour="wizard-upload"
          >
            <FileUp className="size-6 text-primary" strokeWidth={1.7} />
            <span className="text-[14.5px] font-semibold">Attach your pre-approval letter</span>
            <span className="text-[12.5px] text-muted-foreground">Optional · PDF, JPG or PNG up to 10 MB</span>
          </motion.button>
        )}
      </AnimatePresence>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => handle(e.target.files?.[0])} data-testid="file-input" aria-label="Choose a pre-approval document" />
      {(err || error) && <p className="text-[13px] font-medium text-destructive" role="alert">{err || error}</p>}
      {!value && progress === null && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => accept(SAMPLE_DOC)}><FileText /> Use a generated sample PDF</Button>
          {onSkip && <Button type="button" variant={skipped ? "secondary" : "ghost"} size="sm" onClick={onSkip} aria-pressed={skipped}>{skipped ? "Skipped, you can add it later" : "Skip for now"}</Button>}
        </div>
      )}
    </div>
  );
}
