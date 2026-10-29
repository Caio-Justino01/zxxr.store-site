import { useState } from "react";

export default function PreviewControls({
  replay,
  sync,
  reduced,
  toggleMotion,
}: {
  replay: () => void;
  sync: () => Promise<void>;
  reduced: boolean;
  toggleMotion: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState("2026-11-01T00:00");
  async function scenario(name: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/__preview/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: name,
          ...(name === "custom" ? { opensAt: `${date}:00-03:00` } : {}),
        }),
      });
      if (!response.ok)
        throw new Error("Não foi possível aplicar a simulação.");
      if (name === "images-fail" || name === "actual") {
        window.location.reload();
        return;
      }
      await sync();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulação indisponível.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="preview-tools">
      <summary>Controles da prévia</summary>
      <div className="preview-tools-panel">
        <p>Somente neste localhost. A loja pública continua aberta.</p>
        <div className="preview-tool-buttons">
          <button type="button" onClick={replay}>
            Repetir colagem
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void scenario("actual")}
          >
            Restaurar data
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void scenario("last-seconds")}
          >
            Simular últimos 12 s
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void scenario("offline")}
          >
            Simular sem conexão
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void scenario("images-fail")}
          >
            Testar sem imagens
          </button>
          <button type="button" aria-pressed={reduced} onClick={toggleMotion}>
            {reduced ? "Restaurar movimento" : "Testar movimento reduzido"}
          </button>
        </div>
        <label>
          Data provisória · Brasília
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy || !date}
          onClick={() => void scenario("custom")}
        >
          Testar esta data
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
