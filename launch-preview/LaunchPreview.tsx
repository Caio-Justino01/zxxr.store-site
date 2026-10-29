import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import gsap from "gsap";

import { GradientBackdrop } from "../src/components/GradientBackdrop";

import { launchConfig } from "./config.ts";

import { DigitalDisplay } from "./DigitalDisplay";

import { Mosaic } from "./Mosaic";

import { useFloatDrift } from "./use-float-drift";

import { useLaunchCountdown } from "./use-launch-countdown";

import { useLaunchIdle } from "./use-launch-idle";

import type { PresentationPhase } from "./idle-motion.ts";

const PreviewControls = import.meta.env.DEV
  ? lazy(() => import("./PreviewControls"))
  : null;

function launchDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "Data de abertura em definição";

  const day = new Intl.DateTimeFormat("pt-BR", {
    timeZone: launchConfig.timeZone,

    day: "2-digit",

    month: "long",
  }).format(date);

  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: launchConfig.timeZone,

    hour: "2-digit",

    minute: "2-digit",

    hourCycle: "h23",
  })

    .format(date)

    .replace(":00", "h")

    .replace(":", "h");

  return day + " · " + time + " · Brasília";
}

export function LaunchPreview() {
  const root = useRef<HTMLElement>(null);

  const stage = useRef<HTMLDivElement>(null);

  const introTimeline = useRef<gsap.core.Timeline | null>(null);

  const pauseButton = useRef<HTMLButtonElement>(null);

  const previousFocus = useRef<HTMLElement | null>(null);

  const keyboardReturn = useRef(false);

  const phaseRef = useRef<PresentationPhase>("normal");

  const [presentation, setPresentation] = useState<PresentationPhase>("normal");

  const [intro, setIntro] = useState(true);
  const [mosaicReady, setMosaicReady] = useState(false);
  const handleMosaicReady = useCallback(() => setMosaicReady(true), []);

  const [introRun, setIntroRun] = useState(0);

  const [artFailed, setArtFailed] = useState(false);

  const [released, setReleased] = useState(false);

  const [paused, setPaused] = useState(false);

  const [previewReduced, setPreviewReduced] = useState(false);

  const [nativeReduced, setNativeReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const reduced = nativeReduced || (import.meta.env.DEV && previewReduced);

  const { status, seconds, connection, sync } = useLaunchCountdown();

  const idleEnabled =
    !intro && !released && !paused && !reduced && connection === "ready";

  const { idle, wake } = useLaunchIdle(idleEnabled);

  const onPhaseChange = useCallback((next: PresentationPhase) => {
    if (next === "entering-idle") {
      const active = document.activeElement;

      if (
        active instanceof HTMLElement &&
        root.current?.contains(active) &&
        active !== root.current
      ) {
        previousFocus.current = active;

        root.current.focus({ preventScroll: true });
      }
    }

    phaseRef.current = next;

    setPresentation(next);
  }, []);

  useFloatDrift(stage, {
    idle: idle && idleEnabled,

    bobbing: !intro && !released && !paused,

    reduced,

    onPhaseChange,
  });

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (phaseRef.current === "normal") return;

      keyboardReturn.current = true;

      if (["Tab", "Escape", "Enter", " "].includes(event.key))
        event.preventDefault();

      wake();
    };

    document.addEventListener("keydown", key, true);

    return () => document.removeEventListener("keydown", key, true);
  }, [wake]);

  useEffect(() => {
    if (presentation !== "normal" || !keyboardReturn.current) return;

    keyboardReturn.current = false;

    const target = previousFocus.current;

    if (
      target?.isConnected &&
      !target.closest("[inert]") &&
      !target.matches(":disabled")
    )
      target.focus({ preventScroll: true });
    else pauseButton.current?.focus({ preventScroll: true });
  }, [presentation]);

  function finishIntro() {
    if (root.current) root.current.dataset.scene = "waiting";

    setIntro(false);
  }

  useEffect(() => {
    const media = gsap.matchMedia();

    media.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",

        motion: "(prefers-reduced-motion: no-preference)",
      },

      (context) => {
        setNativeReduced(Boolean(context.conditions?.reduce));
      },
    );

    return () => media.revert();
  }, []);

  useEffect(() => {
    const element = root.current!;

    if (!intro) return;
    if (!mosaicReady) {
      element.dataset.scene = "preparing";
      return;
    }
    element.dataset.scene = reduced ? "collage" : "assembling";

    let timeline: gsap.core.Timeline;

    const context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true, onComplete: finishIntro });

      introTimeline.current = timeline;

      const tiles = [...element.querySelectorAll(".collage-tile")];
      if (reduced) {
        timeline.set(tiles, { opacity: 1, x: 0, y: 0, rotation: 0 }, 0);
        // Keep the complete photographic mosaic; remove travel, rotation and zoom.
        timeline.set(
          ".waiting-brand,.waiting-object,.waiting-caption",
          { opacity: 1, y: 0 },
          2.8,
        );
        return;
      }

      timeline.fromTo(
        tiles,

        {
          opacity: 0,

          x: (i) => (i % 2 ? -1 : 1) * 48,

          y: (i) => ((i % 3) - 1) * 42,

          rotation: (i) => (i % 2 ? -1.2 : 1.2),
        },

        {
          opacity: 1,

          x: 0,

          y: 0,

          rotation: 0,

          duration: 1.05,

          stagger: 0.15,

          ease: "power3.out",
        },

        0,
      );

      timeline.to(
        tiles,

        {
          opacity: 0,

          x: (i) => (i % 2 ? -10 : 10),

          y: (i) => ((i % 3) - 1) * 8,

          duration: 0.425,

          stagger: 0.025,

          ease: "sine.inOut",
        },

        5.4,
      );

      timeline.call(
        () => {
          element.dataset.scene = "collage";
        },

        [],

        2.1,
      );

      timeline.call(
        () => {
          element.dataset.scene = "dissolving";
        },

        [],

        5.4,
      );

      timeline.fromTo(
        ".waiting-brand",

        { opacity: 0, y: 10 },

        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },

        5.4,
      );

      timeline.fromTo(
        ".waiting-object",

        { opacity: 0 },

        { opacity: 1, duration: 0.5, ease: "sine.inOut" },

        5.4,
      );

      timeline.fromTo(
        ".waiting-caption",

        { opacity: 0 },

        { opacity: 1, duration: 0.45 },

        5.45,
      );
    }, element);

    function pauseIntro() {
      timeline.paused(document.visibilityState === "hidden");
    }

    document.addEventListener("visibilitychange", pauseIntro);

    pauseIntro();

    return () => {
      document.removeEventListener("visibilitychange", pauseIntro);

      introTimeline.current = null;

      context.revert();
    };
  }, [introRun, reduced, mosaicReady, intro]);

  const authorizedOpen = Boolean(status?.enabled && status.isOpen);

  useEffect(() => {
    if (!authorizedOpen) {
      setReleased(false);

      return;
    }

    if (intro) return;

    setReleased(true);

    const context = gsap.context(() => {
      gsap.to(".waiting-content", {
        opacity: 0,

        duration: reduced ? 0 : 0.65,

        delay: 1.1,

        ease: "sine.inOut",

        onComplete: () =>
          window.location.assign(
            window.location.pathname === "/espera.html"
              ? "/"
              : window.location.pathname +
                  window.location.search +
                  window.location.hash,
          ),
      });
    }, root);

    return () => context.revert();
  }, [authorizedOpen, intro, reduced]);

  function skip() {
    introTimeline.current?.progress(1);

    finishIntro();

    window.requestAnimationFrame(() =>
      root.current?.querySelector<HTMLElement>("h1")?.focus(),
    );
  }

  function replay() {
    setMosaicReady(false);
    setIntro(true);

    setIntroRun((value) => value + 1);
  }

  const notice = released
    ? "Chegou a hora. Entrando no drop…"
    : status && !status.opensAt
      ? "Data de abertura em definição."
      : connection === "retrying"
        ? seconds === 0
          ? "Aguardando conexão para confirmar a abertura…"
          : "Reconectando a contagem…"
        : seconds === 0
          ? "Confirmando a abertura…"
          : connection === "loading"
            ? "Sincronizando o relógio…"
            : "";

  const screen = launchConfig.float.screen;

  const screenStyle = {
    "--screen-left": screen.left + "%",

    "--screen-top": screen.top + "%",

    "--screen-width": screen.width + "%",

    "--screen-height": screen.height + "%",
  } as CSSProperties;

  return (
    <main
      ref={root}
      className="launch-experience"
      data-version="5-ready-mosaic"
      data-reduced={reduced}
      data-mosaic-ready={mosaicReady}
      data-presentation={presentation}
      data-intro={intro}
      data-connection={connection}
      data-released={released}
      tabIndex={-1}
    >
      {import.meta.env.DEV && previewReduced ? (
        <div
          className="gradient-backdrop waiting-background"
          data-background-state="static"
          aria-hidden="true"
        />
      ) : (
        <GradientBackdrop className="waiting-background" />
      )}

      <div className="waiting-content" inert={intro} aria-hidden={intro}>
        <header
          className="waiting-brand"
          inert={presentation !== "normal"}
          aria-hidden={presentation !== "normal"}
        >
          <img
            className="waiting-logo"
            src="/brand/logo-black.svg"
            width="668"
            height="256"
            alt="ZXXR"
          />

          <div className="waiting-title">
            <h1 tabIndex={-1}>Desejos</h1>

            <span className="waiting-creator">
              Created by
              <img
                src="/brand/razz-seal-black.svg"
                width="100"
                height="51"
                alt="Razz"
              />
            </span>
          </div>
        </header>

        <div
          className="waiting-object"
          ref={stage}
          aria-label="Relógio flutuando na piscina"
        >
          <div className="float-drift">
            <div
              className="unicorn-float"
              data-art={artFailed ? "failed" : "ready"}
              style={screenStyle}
            >
              <img
                className="unicorn-art"
                src={launchConfig.float.src}
                srcSet={launchConfig.float.srcSet}
                sizes="(max-width: 699px) 95vw, 520px"
                width={launchConfig.float.width}
                height={launchConfig.float.height}
                alt="Boia branca de unicórnio com relógio de aço escovado prata e visor preto, vista de cima."
                fetchPriority="high"
                onError={() => setArtFailed(true)}
              />

              <DigitalDisplay seconds={seconds} />
            </div>
          </div>
        </div>

        <footer
          className="waiting-caption"
          inert={presentation !== "normal"}
          aria-hidden={presentation !== "normal"}
        >
          <p className="launch-date">
            <time
              dateTime={
                status && !status.opensAt
                  ? undefined
                  : (status?.opensAt ?? launchConfig.opensAt)
              }
            >
              {status && !status.opensAt
                ? "Data de abertura em definição"
                : launchDate(status?.opensAt ?? launchConfig.opensAt)}
            </time>
          </p>

          <button
            ref={pauseButton}
            className="pause-drift"
            title={paused ? "Retomar movimento" : "Pausar movimento"}
            aria-label={paused ? "Retomar movimento" : "Pausar movimento"}
            type="button"
            disabled={reduced || released}
            aria-pressed={paused || reduced}
            onClick={() => setPaused((value) => !value)}
          >
            <span aria-hidden="true">{paused || reduced ? "▷" : "Ⅱ"}</span>

            <span className="launch-sr-only">Controle de movimento</span>
          </button>

          <p className="launch-status" role="status" aria-live="polite">
            {notice}
          </p>
        </footer>
      </div>

      {intro && <Mosaic key={introRun} onReady={handleMosaicReady} />}

      {intro && (
        <button className="skip-intro" type="button" onClick={skip}>
          Pular apresentação <span aria-hidden="true">↗</span>
        </button>
      )}

      {PreviewControls && (
        <div
          className="preview-tools-shell"
          inert={presentation !== "normal"}
          aria-hidden={presentation !== "normal"}
        >
          <Suspense fallback={null}>
            <PreviewControls
              replay={replay}
              sync={sync}
              reduced={previewReduced}
              toggleMotion={() => setPreviewReduced((value) => !value)}
            />
          </Suspense>
        </div>
      )}
    </main>
  );
}
