import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import { buscarProdutos, categoriaBonita, getCategorias } from "@/lib/site";
import { escolherLoja } from "@/lib/lojas";
import { IconeCaixa, IconeCarrinho, IconeWhatsApp } from "@/components/Icones";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Produtos de informática, tintas, toners, cabos e acessórios em estoque na Info In Time.",
};

const POR_PAGINA = 24;
// Sem ordenacao escolhida, a lista mostra primeiro os produtos com foto ("relevancia").
// Clicar de novo numa ordenacao ativa volta para essa ordem padrao.
const ORDENS = [
  { valor: "menor_preco", label: "Menor preço" },
  { valor: "maior_preco", label: "Maior preço" },
];

type SP = Promise<{ q?: string; cat?: string; ordem?: string; pagina?: string }>;

function montarHref(base: Base, extra: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  const tudo = { ...base, ...extra };
  for (const [k, v] of Object.entries(tudo)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/produtos?${s}` : "/produtos";
}

type Resultado = ReturnType<typeof buscarProdutos>;
type Base = { q?: string; cat?: string; ordem?: string };

async function Contagem({ resultado }: { resultado: Resultado }) {
  const { total, erro } = await resultado;
  if (erro) return "Não foi possível carregar os produtos";
  return total === 1 ? "1 produto em estoque" : `${total} produtos em estoque`;
}

// Mesma grade da lista, com cartoes vazios pulsando enquanto a consulta nao volta.
function ListaCarregando() {
  return (
    <div role="status" aria-label="Carregando produtos" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-cartao bg-white shadow-suave ring-1 ring-linha/70">
          <div className="flex aspect-square items-center justify-center bg-fundo text-azul/15">
            <IconeCaixa className="size-12" />
          </div>
          <div className="space-y-2.5 px-4 pb-4 pt-3">
            <div className="h-3 w-1/3 rounded bg-fundo" />
            <div className="h-4 w-full rounded bg-fundo" />
            <div className="h-4 w-2/3 rounded bg-fundo" />
            <div className="h-7 w-1/2 rounded bg-fundo" />
            <div className="h-10 w-full rounded-full bg-fundo" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function Lista({ resultado, q, base, pagina }: { resultado: Resultado; q: string; base: Base; pagina: number }) {
  const { itens, total, erro } = await resultado;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  // Falha na consulta nao e "sem estoque": avisa e deixa tentar de novo.
  if (erro) {
    return (
      <div role="alert" className="rounded-cartao bg-white p-8 text-center shadow-suave ring-1 ring-linha/70">
        <p className="text-xl font-bold text-marinho">Não conseguimos carregar os produtos agora</p>
        <p className="mx-auto mt-2 max-w-md text-suave">
          Foi uma falha momentânea do site, não falta de estoque. Tente de novo em instantes ou fale com a equipe.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {/* <a> comum (nao Link): recarrega a pagina inteira e refaz a consulta. */}
          <a href={montarHref(base, { pagina: pagina > 1 ? String(pagina) : undefined })} className="button button--lg button--tertiary">
            Tentar de novo
          </a>
          <a
            {...escolherLoja(q ? `Olá! Vocês têm ${q}?` : "Olá! Vim pelo site da Info In Time.")}
            className="button button--lg button--zap"
          >
            <IconeWhatsApp /> Perguntar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {itens.length ? (
        <section aria-labelledby="lista-produtos">
          <h2 id="lista-produtos" className="sr-only">Lista de produtos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
            {itens.map((p, i) => (
              <ProductCard key={p.codigo} produto={p} prioridade={i < 4} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-cartao bg-white shadow-suave ring-1 ring-linha/70 p-8 text-center">
          <p className="text-xl font-bold text-marinho">Nenhum produto encontrado no estoque online</p>
          <p className="mx-auto mt-2 max-w-md text-suave">
            Nem tudo que temos na loja aparece aqui. Mande uma mensagem que a equipe confere para você.
          </p>
          <a
            {...escolherLoja(q ? `Olá! Vocês têm ${q}?` : "Olá! Vim pelo site da Info In Time.")}
            className="button button--lg button--zap mt-5"
          >
            <IconeWhatsApp /> Perguntar no WhatsApp
          </a>
        </div>
      )}

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {pagina > 1 && (
            <Link href={montarHref(base, { pagina: String(pagina - 1) })} className="button button--tertiary">
              Anterior
            </Link>
          )}
          <span className="px-2 text-suave">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={montarHref(base, { pagina: String(pagina + 1) })} className="button button--tertiary">
              Próxima
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

export default async function Produtos({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q || "").slice(0, 80);
  const cat = sp.cat || "";
  const ordem = ORDENS.some((o) => o.valor === sp.ordem) ? sp.ordem! : "relevancia";
  const ordenado = ordem !== "relevancia";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  // A consulta dos produtos nao segura a pagina: titulo, ordenacao e categorias saem na
  // hora e a lista chega em seguida (Suspense). Assim, ao trocar de filtro, o cliente ve
  // o novo titulo e um "carregando" em vez da lista antiga parada na tela.
  const resultado: Resultado = buscarProdutos({ busca: q, categoria: cat, ordem, pagina, porPagina: POR_PAGINA });
  const categorias = await getCategorias();
  const base = { q: q || undefined, cat: cat || undefined, ordem: ordem !== "relevancia" ? ordem : undefined };
  // Muda a cada troca de filtro, para o "carregando" aparecer de novo.
  const chave = JSON.stringify([q, cat, ordem, pagina]);

  const titulo = q
    ? `Resultados para “${q}”${cat ? ` em ${categoriaBonita(cat)}` : ""}`
    : cat
      ? categoriaBonita(cat)
      : "Todos os produtos";

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="faixa-curta" />
          <h1 className="mt-2 text-3xl font-extrabold text-marinho sm:text-4xl">{titulo}</h1>
          <p className="mt-1 text-suave">
            <Suspense key={chave} fallback="Carregando produtos…">
              <Contagem resultado={resultado} />
            </Suspense>
            {(q || cat || ordenado) && (
              <>
                {" · "}
                <Link href="/produtos" className="text-azul hover:underline">
                  limpar filtros
                </Link>
              </>
            )}
          </p>
        </div>
        <nav aria-label="Ordenar" className="flex flex-wrap gap-1.5">
          {ORDENS.map((o) => (
            <Link
              key={o.valor}
              href={montarHref(base, { ordem: o.valor === ordem ? undefined : o.valor, pagina: undefined })}
              aria-current={o.valor === ordem ? "true" : undefined}
              className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                o.valor === ordem ? "bg-azul text-white shadow-suave" : "bg-white text-suave ring-1 ring-linha hover:text-azul"
              }`}
            >
              {o.label}
              {o.valor === ordem ? (
                <>
                  <span aria-hidden className="ml-1.5">✕</span>
                  <span className="sr-only"> (clique para remover)</span>
                </>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>

      {/* Explica o carrinho logo no catalogo: muita gente so conhece o "chama no zap". */}
      <p className="mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[15px] text-suave shadow-suave ring-1 ring-linha/70">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-azul/10 text-azul">
          <IconeCarrinho />
        </span>
        <span>
          <b className="text-texto">Monte seu pedido:</b> toque em <b className="text-azul">Adicionar</b> nos produtos e,
          no carrinho, envie a lista inteira pelo WhatsApp.
        </span>
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="hidden self-start rounded-cartao bg-white p-4 shadow-suave ring-1 ring-linha/70 lg:sticky lg:top-40 lg:block">
          <p className="font-bold text-marinho">Categorias</p>
          <ul className="mt-2 space-y-0.5 text-[15px]">
            <li>
              <Link
                href={montarHref({ q: base.q, ordem: base.ordem }, {})}
                className={`flex justify-between rounded-md px-2 py-1.5 ${!cat ? "bg-azul/8 font-semibold text-azul" : "text-suave hover:bg-fundo hover:text-texto"}`}
              >
                Todas
              </Link>
            </li>
            {categorias.map((c) => (
              <li key={c.categoria}>
                <Link
                  // Sem a busca: quem clica numa categoria quer ver a categoria inteira. A caixa
                  // de busca do topo fica vazia, entao uma busca antiga guardada no endereco
                  // filtrava a categoria sem o cliente ver ("hub" em Toners = nenhum produto).
                  href={montarHref({ ordem: base.ordem }, { cat: c.categoria })}
                  className={`flex justify-between gap-2 rounded-md px-2 py-1.5 ${
                    cat === c.categoria ? "bg-azul/8 font-semibold text-azul" : "text-suave hover:bg-fundo hover:text-texto"
                  }`}
                >
                  <span>{categoriaBonita(c.categoria)}</span>
                  <span className="text-xs leading-6 text-suave">{c.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <Suspense key={chave} fallback={<ListaCarregando />}>
            <Lista resultado={resultado} q={q} base={base} pagina={pagina} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
