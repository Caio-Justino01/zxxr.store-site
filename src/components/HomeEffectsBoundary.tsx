import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import {
  reportHomeFault,
  reportHomeStage,
  shouldInjectHomeFault,
  type HomeStage,
} from "../lib/home-diagnostics";

type Props = { stage: HomeStage; children: ReactNode; fallback: ReactNode };

function HomeEffectProbe({ stage }: { stage: HomeStage }) {
  useEffect(() => {
    reportHomeStage(stage);
    if (
      shouldInjectHomeFault(
        stage,
        location.hostname,
        location.search,
        location.pathname,
      )
    ) {
      throw new Error("Home effect failure simulation");
    }
  }, [stage]);
  return null;
}

/** A local effect failure must not remove the store's surrounding navigation. */
export class HomeEffectsBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportHomeFault(this.props.stage, error, info);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return (
      <>
        <HomeEffectProbe stage={this.props.stage} />
        {this.props.children}
      </>
    );
  }
}
