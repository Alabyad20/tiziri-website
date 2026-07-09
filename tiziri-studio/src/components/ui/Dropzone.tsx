import { useRef, useState, type ReactNode } from "react";
import { cn, readFileAsDataURL } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { IconUpload } from "@/components/icons";

export function Dropzone({
  onImage,
  className,
  children,
  compact = false,
}: {
  /** Called with a data URL once a valid image is dropped or picked. */
  onImage: (dataUrl: string, file: File) => void;
  className?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("That file isn't an image", "error");
      return;
    }
    const dataUrl = await readFileAsDataURL(file);
    onImage(dataUrl, file);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all",
        compact ? "gap-2 p-6" : "gap-3 p-12",
        dragging
          ? "border-accent bg-accent-soft/60"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {children ?? (
        <>
          <div
            className={cn(
              "flex items-center justify-center rounded-2xl bg-surface-2 text-ink-2 transition-colors group-hover:text-accent",
              compact ? "h-10 w-10" : "h-14 w-14",
            )}
          >
            <IconUpload size={compact ? 18 : 24} />
          </div>
          <div>
            <p className={cn("font-medium text-ink", compact ? "text-[13px]" : "text-[15px]")}>
              Drop a rug photo here
            </p>
            <p className="mt-0.5 text-[13px] text-ink-3">or click to browse — JPG, PNG, WebP</p>
          </div>
        </>
      )}
    </button>
  );
}
