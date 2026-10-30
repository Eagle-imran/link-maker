import { useEffect, useRef, useState } from "react";

/** Copies text and remembers which button did it for 1.5 seconds, so that
 * button can say "Copied". */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(text: string, tag: string) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Restricted contexts (in-app browsers): legacy fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    }
    if (!ok) return;
    setCopied(tag);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1500);
  }

  function reset() {
    setCopied(null);
    clearTimeout(timer.current);
  }

  return { copied, copy, reset };
}
