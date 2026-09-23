import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Database,
  Filter,
  Info,
  LayoutDashboard,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  CATEGORIES,
  DEMO,
  EFFORTS,
  load,
  MODEL_META,
  MODELS,
  OUTCOMES,
  save,
} from "./data";
import { grouped, metrics, recommendation } from "./analytics";
import type { Effort, Model, Outcome, Store, Trial } from "./types";

type View = "overview" | "history" | "compare" | "community";
const MODEL_ART: Record<Model, string> = {
  Luna: "./models/luna-real.png",
  Terra: "./models/terra-real.png",
  Sol: "./models/sol-real.png",
  Astra: "./models/astra-real.png",
};
const blank = (): Trial => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  model: "Terra",
  effort: "medium",
  category: "Código",
  description: "",
  complexity: 3,
  outcome: "first",
  attempts: 1,
  notes: "",
});
const fmt = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(d))
    .replace(".", "");
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: any;
  wide?: boolean;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header>
          <div>
            <span className="eyebrow">Diário de bordo</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function TrialForm({
  value,
  onSave,
  onClose,
}: {
  value: Trial;
  onSave: (t: Trial) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof Trial, x: any) => setV({ ...v, [k]: x });
  const submit = (e: any) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (v.description.trim().length < 3)
      er.description = "Descreva a tarefa em pelo menos 3 caracteres.";
    if (v.attempts < 1) er.attempts = "Use no mínimo 1.";
    setErrors(er);
    if (!Object.keys(er).length)
      onSave({
        ...v,
        description: v.description.trim(),
        notes: v.notes?.trim(),
        demo: false,
      });
  };
  return (
    <form onSubmit={submit} className="trial-form">
      <div className="form-grid">
        <label>
          Modelo
          <select
            value={v.model}
            onChange={(e) => set("model", e.target.value)}
          >
            {MODELS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Nível de raciocínio
          <select
            value={v.effort}
            onChange={(e) => set("effort", e.target.value)}
          >
            {EFFORTS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Categoria
          <select
            value={v.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Complexidade percebida
          <select
            value={v.complexity}
            onChange={(e) => set("complexity", Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((x) => (
              <option key={x} value={x}>
                {x} —{" "}
                {
                  [
                    "",
                    "Muito simples",
                    "Simples",
                    "Moderada",
                    "Complexa",
                    "Muito complexa",
                  ][x]
                }
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="full">
        Descrição curta
        <input
          autoFocus
          value={v.description}
          maxLength={120}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ex.: Refatorar fluxo de autenticação"
        />
        {errors.description && (
          <small className="error">{errors.description}</small>
        )}
      </label>
      <fieldset>
        <legend>Resultado</legend>
        <div className="outcome-grid">
          {(Object.keys(OUTCOMES) as Outcome[]).map((x) => (
            <button
              type="button"
              key={x}
              className={"outcome " + (v.outcome === x ? "selected" : "")}
              onClick={() => set("outcome", x)}
            >
              <span>{v.outcome === x && <Check size={15} />}</span>
              {OUTCOMES[x]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-grid three">
        <label>
          Tentativas
          <input
            type="number"
            min="1"
            max="99"
            value={v.attempts}
            onChange={(e) => set("attempts", Number(e.target.value))}
          />
          {errors.attempts && (
            <small className="error">{errors.attempts}</small>
          )}
        </label>
        <label>
          Tempo aproximado (min)
          <input
            type="number"
            min="0"
            placeholder="Opcional"
            value={v.minutes ?? ""}
            onChange={(e) =>
              set(
                "minutes",
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
          />
        </label>
        <label>
          Tokens / créditos
          <input
            type="number"
            min="0"
            placeholder="Opcional"
            value={v.tokens ?? ""}
            onChange={(e) =>
              set(
                "tokens",
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
          />
        </label>
      </div>
      <label className="full">
        Observações
        <textarea
          value={v.notes}
          maxLength={500}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="O que ajudou? O que precisou mudar?"
        />
      </label>
      <footer>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary">
          Salvar teste <ChevronRight size={17} />
        </button>
      </footer>
    </form>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: any;
}) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Empty({ onNew, onDemo }: { onNew: () => void; onDemo: () => void }) {
  return (
    <section className="empty">
      <div className="orbit-mark">
        <Compass />
        <i />
        <i />
      </div>
      <span className="eyebrow">Seu mapa começa aqui</span>
      <h2>Troque o palpite por evidência.</h2>
      <p>
        Registre como cada combinação se comporta no seu trabalho. Em poucos
        testes, padrões pessoais começam a aparecer — sem gastar tokens pedindo
        recomendações.
      </p>
      <div>
        <button className="btn primary" onClick={onNew}>
          <Plus /> Registrar primeiro teste
        </button>
        <button className="btn ghost" onClick={onDemo}>
          <Sparkles /> Explorar com dados de demonstração
        </button>
      </div>
      <small>
        <Database size={14} /> Tudo fica apenas neste dispositivo.
      </small>
    </section>
  );
}
function MiniBars({
  data,
  color = "var(--violet)",
}: {
  data: { label: string; count: number; success: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((x) => x.count), 1);
  return (
    <div className="mini-bars">
      {data.map((x) => (
        <div className="bar-row" key={x.label}>
          <span>{x.label}</span>
          <div>
            <i
              style={{ width: `${(x.count / max) * 100}%`, background: color }}
            />
          </div>
          <b>{x.count}</b>
        </div>
      ))}
    </div>
  );
}
function CategoryBreakdown({
  data,
  total,
}: {
  data: { label: string; count: number; success: number }[];
  total: number;
}) {
  return (
    <div className="category-list">
      {data.map((item) => {
        const share = Math.round((item.count / Math.max(total, 1)) * 100);
        return (
          <div className="category-item" key={item.label}>
            <div className="category-copy">
              <strong>{item.label}</strong>
              <span>{item.success}% de sucesso</span>
            </div>
            <b>{item.count}</b>
            <div className="category-track" aria-label={`${share}% dos testes`}>
              <i style={{ width: `${share}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Overview({
  trials,
  onNew,
  onDemo,
}: {
  trials: Trial[];
  onNew: () => void;
  onDemo: () => void;
}) {
  if (!trials.length) return <Empty onNew={onNew} onDemo={onDemo} />;
  const m = metrics(trials),
    models = grouped(trials, "model"),
    cats = grouped(trials, "category").slice(0, 5),
    rec = recommendation(trials),
    realCount = trials.filter((trial) => !trial.demo).length,
    insightProgress = Math.min(realCount, 3);
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Observatório pessoal</span>
          <h1>
            Decida com o seu
            <br />
            <em>próprio histórico.</em>
          </h1>
          <p>
            Descubra quais modelos e níveis de raciocínio realmente entregam no
            seu tipo de trabalho.
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="sun">
            {m.success}
            <small>%</small>
            <span>sucesso</span>
          </div>
          {MODELS.map((x, i) => (
            <i key={x} className={"planet p" + i} title={x} />
          ))}
        </div>
      </section>
      <div className="stats">
        <Stat
          label="Taxa de sucesso"
          value={`${m.success}%`}
          detail={`${trials.filter((t) => t.outcome !== "failed").length} de ${m.total} testes`}
          icon={<BarChart3 />}
        />
        <Stat
          label="De primeira"
          value={`${m.first}%`}
          detail="sem ajustes adicionais"
          icon={<Check />}
        />
        <Stat
          label="Tentativas médias"
          value={m.attempts.toFixed(1).replace(".", ",")}
          detail="por tarefa registrada"
          icon={<RotateCcw />}
        />
        <Stat
          label="Tempo observado"
          value={`${trials.reduce((a, t) => a + (t.minutes || 0), 0)} min`}
          detail="somente dados informados"
          icon={<Clock3 />}
        />
      </div>
      <div className="dashboard-grid">
        <article className="panel span2">
          <header>
            <div>
              <span className="eyebrow">Desempenho</span>
              <h3>Sucesso por modelo</h3>
            </div>
            <span className="muted">base: {trials.length} testes</span>
          </header>
          <div className="model-performance">
            {MODELS.map((model) => {
              const x = models.find((v) => v.label === model);
              return (
                <div className={"model-col " + model.toLowerCase()} key={model}>
                  <div className="model-art-wrap">
                    <img
                      className="model-art"
                      src={MODEL_ART[model]}
                      alt={`Retrato cósmico do modelo ${model}`}
                    />
                  </div>
                  <div
                    className="score-ring"
                    style={{ "--score": `${x?.success || 0}%` } as any}
                  >
                    <span>
                      {x?.success || 0}
                      <small>%</small>
                    </span>
                  </div>
                  <strong>{model}</strong>
                  <small>
                    {MODEL_META[model].tag} · {x?.count || 0} testes
                  </small>
                </div>
              );
            })}
          </div>
        </article>
        <article className="panel">
          <header>
            <div>
              <span className="eyebrow">Mix de trabalho</span>
              <h3>Categorias</h3>
            </div>
            <span className="muted">{cats.length} categorias</span>
          </header>
          <CategoryBreakdown data={cats} total={trials.length} />
        </article>
        <article className="panel insight">
          <div className="insight-icon" aria-hidden="true">
            <BrainCircuit />
          </div>
          <div>
            <span className="eyebrow">Inferência local</span>
            <h3>{rec.title}</h3>
            <p>{rec.text}</p>
            <div className="insight-progress">
              <div>
                <i style={{ width: `${(insightProgress / 3) * 100}%` }} />
              </div>
              <strong>{insightProgress} de 3 testes reais</strong>
            </div>
            <small>
              Baseada somente nos seus registros. Não é recomendação oficial nem
              garantia.
            </small>
          </div>
        </article>
        <article className="panel span2">
          <header>
            <div>
              <span className="eyebrow">Atividade recente</span>
              <h3>Últimos testes</h3>
            </div>
            <span className="muted">{Math.min(trials.length, 4)} registros</span>
          </header>
          <TrialTable trials={trials.slice(0, 4)} compact />
        </article>
      </div>
    </>
  );
}
function TrialTable({
  trials,
  onEdit,
  onDelete,
  compact = false,
}: {
  trials: Trial[];
  onEdit?: (t: Trial) => void;
  onDelete?: (t: Trial) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="activity-list">
        {trials.map((t) => (
          <article className="activity-item" key={t.id}>
            <div className="activity-main">
              <strong>{t.description}</strong>
              <span>
                {t.category} · {fmt(t.createdAt)}
              </span>
            </div>
            <div className="activity-model">
              <span className={"model-dot " + t.model.toLowerCase()} />
              <strong>{t.model}</strong>
              <small>{t.effort}</small>
            </div>
            <span className={"result " + t.outcome}>{OUTCOMES[t.outcome]}</span>
            <div className="activity-attempts">
              <strong>{t.attempts}</strong>
              <span>{t.attempts === 1 ? "tentativa" : "tentativas"}</span>
            </div>
          </article>
        ))}
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tarefa</th>
            <th>Combinação</th>
            <th>Resultado</th>
            <th>Tentativas</th>
            {!compact && <th>Data</th>}
            {!compact && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {trials.map((t) => (
            <tr key={t.id}>
              <td data-label="Tarefa">
                <strong>{t.description}</strong>
                <small>
                  {t.category}
                  {t.demo ? " · demonstração" : ""}
                </small>
              </td>
              <td data-label="Combinação">
                <span className="combo-chip">
                  <span className={"model-dot " + t.model.toLowerCase()} />
                  <strong>{t.model}</strong>
                  <small>{t.effort}</small>
                </span>
              </td>
              <td data-label="Resultado">
                <span className={"result " + t.outcome}>
                  {OUTCOMES[t.outcome]}
                </span>
              </td>
              <td data-label="Tentativas">
                <span className="attempt-count">{t.attempts}</span>
              </td>
              {!compact && <td data-label="Data" className="date-cell">{fmt(t.createdAt)}</td>}
              {!compact && (
                <td data-label="Ações">
                  <div className="row-actions">
                    <button
                      onClick={() => onEdit?.(t)}
                      aria-label={`Editar ${t.description}`}
                    >
                      <Pencil />
                    </button>
                    <button
                      onClick={() => onDelete?.(t)}
                      aria-label={`Excluir ${t.description}`}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Community() {
  return (
    <section className="community-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Inteligência compartilhada</span>
          <h1>Dados da comunidade</h1>
          <p>Descubra quais combinações funcionam para cada tarefa, com evidências de quem já testou.</p>
        </div>
      </div>
      <article className="panel community-intro">
        <div className="community-symbol"><Users aria-hidden="true" /></div>
        <span className="eyebrow">Em preparação · sem conexão pública</span>
        <h2>Menos tentativa e erro.<br />Mais decisões com evidência.</h2>
        <p>Este espaço reunirá resultados compartilhados voluntariamente para ajudar você a escolher um modelo adequado antes de gastar tokens.</p>
        <div className="community-principles">
          <div><strong>Por tipo de tarefa</strong><p>Compare categoria, complexidade, modelo e nível de raciocínio em contextos semelhantes.</p></div>
          <div><strong>Resultados com contexto</strong><p>Sucesso, tentativas e tamanho da amostra, sem transformar poucos relatos em um ranking universal.</p></div>
          <div><strong>Consumo observado</strong><p>Tokens e tempo quando informados. Economia precisa ser medida, não presumida.</p></div>
        </div>
      </article>
      <article className="panel community-empty">
        <Database aria-hidden="true" />
        <div><h3>A base pública ainda não está conectada</h3><p>Nenhum registro seu foi publicado. Por enquanto, os testes continuam salvos apenas neste dispositivo.</p><small>A publicação futura deverá pedir sua autorização e compartilhar somente dados estruturados, sem descrições ou observações privadas.</small></div>
      </article>
    </section>
  );
}
function Compare({ trials }: { trials: Trial[] }) {
  const [m1, setM1] = useState<Model>("Luna"),
    [m2, setM2] = useState<Model>("Terra");
  const a = trials.filter((t) => t.model === m1),
    b = trials.filter((t) => t.model === m2),
    ma = metrics(a),
    mb = metrics(b);
  return (
    <section>
      <div className="page-head">
        <div>
          <span className="eyebrow">Lado a lado</span>
          <h1>Comparar combinações</h1>
          <p>Uma leitura direta dos padrões encontrados no seu histórico.</p>
        </div>
      </div>
      <div className="compare-pickers">
        <select value={m1} onChange={(e) => setM1(e.target.value as Model)}>
          {MODELS.filter((x) => x !== m2).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span>versus</span>
        <select value={m2} onChange={(e) => setM2(e.target.value as Model)}>
          {MODELS.filter((x) => x !== m1).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="compare-grid">
        {[
          [m1, ma, a],
          [m2, mb, b],
        ].map(([model, m, items]: any) => (
          <article
            className={"compare-card " + model.toLowerCase()}
            key={model}
          >
            <div className="compare-model-head">
              <div>
                <span className="eyebrow">
                  {MODEL_META[model as Model].tag}
                </span>
                <h2>{model}</h2>
                <p>{MODEL_META[model as Model].desc}</p>
              </div>
              <div className="compare-art-wrap">
                <img
                  src={MODEL_ART[model as Model]}
                  alt={`Retrato cósmico do modelo ${model}`}
                />
              </div>
            </div>
            <dl>
              <div>
                <dt>Taxa de sucesso</dt>
                <dd>{m.success}%</dd>
              </div>
              <div>
                <dt>De primeira</dt>
                <dd>{m.first}%</dd>
              </div>
              <div>
                <dt>Tentativas médias</dt>
                <dd>{m.attempts.toFixed(1).replace(".", ",")}</dd>
              </div>
              <div>
                <dt>Amostra</dt>
                <dd>{m.total}</dd>
              </div>
            </dl>
            <h4>Raciocínio mais usado</h4>
            <MiniBars data={grouped(items, "effort")} />
          </article>
        ))}
      </div>
      <p className="comparison-note">
        <Info /> Comparações com poucas observações podem refletir o tipo de
        tarefa, não apenas o modelo. Trate os números como pistas, não como
        ranking universal.
      </p>
    </section>
  );
}
function App() {
  const [store, setStore] = useState<Store>(load),
    [view, setView] = useState<View>("overview"),
    [editing, setEditing] = useState<Trial | null>(null),
    [deleting, setDeleting] = useState<Trial | null>(null),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [model, setModel] = useState("Todos"),
    [effort, setEffort] = useState("Todos");
  useEffect(() => save(store), [store]);
  useEffect(() => {
    if (notice) {
      const x = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(x);
    }
  }, [notice]);
  const filtered = useMemo(
    () =>
      store.trials.filter(
        (t) =>
          (model === "Todos" || t.model === model) &&
          (effort === "Todos" || t.effort === effort) &&
          `${t.description} ${t.category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [store, search, model, effort],
  );
  const upsert = (t: Trial) => {
    setStore((s) => ({
      ...s,
      trials: [t, ...s.trials.filter((x) => x.id !== t.id)],
    }));
    setEditing(null);
    setNotice("Teste salvo no dispositivo.");
  };
  const demo = () => {
    setStore((s) => ({
      ...s,
      trials: [
        ...s.trials,
        ...DEMO.filter((d) => !s.trials.some((t) => t.id === d.id)),
      ],
    }));
    setNotice("Dados de demonstração adicionados e identificados.");
  };
  const exportCsv = () => {
    const head = [
      "data",
      "modelo",
      "raciocinio",
      "categoria",
      "descricao",
      "complexidade",
      "resultado",
      "tentativas",
      "minutos",
      "tokens",
      "observacoes",
      "demonstracao",
    ];
    const rows = store.trials.map((t) => [
      t.createdAt,
      t.model,
      t.effort,
      t.category,
      t.description,
      t.complexity,
      OUTCOMES[t.outcome],
      t.attempts,
      t.minutes ?? "",
      t.tokens ?? "",
      t.notes ?? "",
      !!t.demo,
    ]);
    download(
      "task-model-dados.csv",
      [head, ...rows]
        .map((r) =>
          r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(","),
        )
        .join("\n"),
      "text/csv",
    );
  };
  return (
    <div className="app-shell">
      <aside>
        <a className="brand" href="#" onClick={() => setView("overview")}>
          <span>
            <img className="brand-mark" src="./brand/task-model-mark-white.png" alt="" />
          </span>
          <div>
            Task Model
          </div>
        </a>
        <nav aria-label="Principal">
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            <LayoutDashboard /> Visão geral
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            <Clock3 /> Histórico <b>{store.trials.length}</b>
          </button>
          <button
            className={view === "compare" ? "active" : ""}
            onClick={() => setView("compare")}
          >
            <BarChart3 /> Comparar
          </button>
          <button
            className={view === "community" ? "active" : ""}
            onClick={() => setView("community")}
          >
            <Users /> Comunidade
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <Database />
            <strong>Seus dados, neste dispositivo.</strong>
            <p>
              Nada é enviado para a nuvem. Limpar o navegador ou usar modo
              anônimo pode apagar seus registros.
            </p>
          </div>
          <button
            className="btn primary full-btn"
            onClick={() => setEditing(blank())}
          >
            <Plus /> Registrar teste
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="mobile-brand">
            <img className="brand-mark" src="./brand/task-model-mark-white.png" alt="" />
            Task Model
          </div>
          <span className="status">
            <i /> Salvo neste dispositivo
          </span>
          <button className="btn text-btn" onClick={exportCsv}>
            <ArrowDownToLine /> Baixar CSV
          </button>
        </header>
        <div className="content">
          {view === "overview" && (
            <Overview
              trials={store.trials}
              onNew={() => setEditing(blank())}
              onDemo={demo}
            />
          )}{" "}
          {view === "history" && (
            <section>
              <div className="page-head">
                <div>
                  <span className="eyebrow">Diário de bordo</span>
                  <h1>Histórico de testes</h1>
                  <p>Revise, filtre e aprenda com cada decisão registrada.</p>
                </div>
                <button
                  className="btn primary"
                  onClick={() => setEditing(blank())}
                >
                  <Plus /> Novo teste
                </button>
              </div>
              <div className="filters">
                <label>
                  <Search />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar tarefa ou categoria..."
                  />
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option>Todos</option>
                  {MODELS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <select
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                >
                  <option>Todos</option>
                  {EFFORTS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <span>
                  <Filter /> {filtered.length} resultados
                </span>
              </div>
              <div className="panel history-panel">
                {filtered.length ? (
                  <TrialTable
                    trials={filtered}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                ) : (
                  <div className="no-results">
                    Nenhum teste corresponde aos filtros.
                  </div>
                )}
              </div>
            </section>
          )}
          {view === "compare" && <Compare trials={store.trials} />}
          {view === "community" && <Community />}
        </div>
      </main>
      {editing && (
        <Modal
          title={
            store.trials.some((t) => t.id === editing.id)
              ? "Editar teste"
              : "Registrar novo teste"
          }
          onClose={() => setEditing(null)}
          wide
        >
          <TrialForm
            value={editing}
            onSave={upsert}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
      {deleting && (
        <Modal title="Excluir este registro?" onClose={() => setDeleting(null)}>
          <div className="confirm">
            <p>
              <strong>{deleting.description}</strong> será removido
              permanentemente deste dispositivo.
            </p>
            <div>
              <button className="btn ghost" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setStore((s) => ({
                    ...s,
                    trials: s.trials.filter((t) => t.id !== deleting.id),
                  }));
                  setDeleting(null);
                  setNotice("Registro excluído.");
                }}
              >
                <Trash2 /> Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast">
          <Check />
          {notice}
        </div>
      )}
    </div>
  );
}
function download(name: string, body: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
export default App;
