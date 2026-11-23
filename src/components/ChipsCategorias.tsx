"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

type Item = { href: string; label: string; cat: string };

// Faixa de categorias do topo. Marca a categoria que esta aberta no catalogo e a traz
// para a area visivel da faixa: no celular esta faixa e o unico menu de categorias, e
// sem a marcacao o cliente nao tinha como saber qual filtro estava valendo.
export default function ChipsCategorias({ categorias }: { categorias: Item[] }) {
  // useSearchParams precisa de Suspense nas paginas estaticas; ate ler o endereco,
  // a faixa aparece sem categoria marcada.
  return (
    <Suspense fallback={<Faixa categorias={categorias} ativa={null} />}>
      <FaixaAtiva categorias={categorias} />
    </Suspense>
  );
}

function FaixaAtiva({ categorias }: { categorias: Item[] }) {
  const noCatalogo = usePathname() === "/produtos";
  const cat = useSearchParams().get("cat");
  return <Faixa categorias={categorias} ativa={noCatalogo && cat ? cat.toUpperCase() : null} />;
}

function Faixa({ categorias, ativa }: { categorias: Item[]; ativa: string | null }) {
  const faixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = faixa.current;
    const chip = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el || !chip) return;
    // Rola so a faixa (nao a pagina) ate o chip ativo ficar centralizado.
    el.scrollTo({ left: chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }, [ativa]);

  return (
    <div ref={faixa} className="scroll-x relative mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 py-2">
      <Link
        href="/produtos"
        className={
          ativa
            ? "flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-suave transition-colors hover:bg-fundo hover:text-azul"
            : "chip chip--accent min-h-10 shrink-0 px-3.5 font-semibold"
        }
      >
        Todos os produtos
      </Link>
      {categorias.map((c) => {
        const atual = c.cat === ativa;
        return (
          <Link
            key={c.href}
            href={c.href}
            aria-current={atual ? "true" : undefined}
            className={
              atual
                ? "flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-azul px-3.5 text-sm font-semibold text-white shadow-suave"
                : "flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm text-suave transition-colors hover:bg-fundo hover:text-azul"
            }
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
