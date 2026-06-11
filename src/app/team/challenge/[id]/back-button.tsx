"use client";

import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    // Browser-back behoudt scroll-positie van de vorige pagina (Next.js doet
    // dit voor App Router). Als er geen vorige history is — bv. directe
    // navigatie via push-notificatie of refresh — vallen we terug op een
    // sensible default URL.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      className="text-sm text-fg-muted hover:text-fg"
    >
      ← terug
    </a>
  );
}
