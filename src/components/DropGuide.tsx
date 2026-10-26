import { useRef } from "react";
import { Arrow } from "./Icons";
import { useGuideReading } from "../lib/use-guide-reading";
import "../drop-guide.css";

const steps = [
  {
    title: "Encontre sua estampa.",
    text: "Veja cada peça de perto, de frente e de costas.",
  },
  {
    title: "Escolha seu tamanho.",
    text: "Veja o caimento nas fotos e selecione do P ao GG.",
  },
  {
    title: "Leve para a sacola.",
    text: "Adicione sua escolha e continue explorando o drop.",
  },
];

const previewSteps = [
  {
    title: "Entre no ensaio.",
    text: "Veja as peças em movimento, nas fotos de quem veste o drop.",
  },
  {
    title: "Sinta cada detalhe.",
    text: "As estampas já estão nas ruas. O restante chega em breve.",
  },
  {
    title: "Conheça quem cria.",
    text: "Desça mais um pouco e encontre a música de Razz.",
  },
];

export function DropGuide({ prelaunch = false }: { prelaunch?: boolean }) {
  const root = useRef<HTMLElement>(null);
  useGuideReading(root);
  return (
    <section
      ref={root}
      className="drop-guide-cta"
      id="como-funciona"
      aria-labelledby="guide-title"
    >
      <div className="dg-stage">
        <div className="dg-content">
          <div className="dg-intro">
            <img
              className="dg-mark"
              src="/brand/mascot-black.svg"
              alt=""
              width="46"
              height="42"
              loading="lazy"
            />
            <h2 id="guide-title" aria-label="A peça que faltava.">
              {["A peça", "que faltava."].map((line) => (
                <span className="dg-title-line" aria-hidden="true" key={line}>
                  {Array.from(line).map((letter, index) => (
                    <span data-guide-letter key={index}>
                      {letter}
                    </span>
                  ))}
                </span>
              ))}
            </h2>
            <p>
              {prelaunch
                ? "O primeiro olhar é seu. Explore o ensaio do drop Desejos."
                : "Escolha a estampa, confira as medidas e monte sua sacola."}
            </p>
            <a className="dg-action" href="#o-drop">
              {prelaunch ? "Explorar o ensaio" : "Encontrar minha peça"}{" "}
              <Arrow />
            </a>
          </div>
          <ol className="dg-steps">
            {(prelaunch ? previewSteps : steps).map((step, index) => (
              <li data-guide-step key={step.title}>
                <span className="dg-step-number" aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
