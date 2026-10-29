export type MosaicImage = {
  complete: boolean;
  naturalWidth: number;
  decode?: () => Promise<void>;
  addEventListener(type: "load" | "error", listener: () => void): void;
  removeEventListener(type: "load" | "error", listener: () => void): void;
};

export type ImageReadiness = "ready" | "failed" | "timeout" | "aborted";

/** Cached images, older browsers and decode failures all settle without hanging
 * the opening. The visible previews are embedded JPEGs, not network requests. */
export function prepareMosaicImages(
  images: readonly MosaicImage[],
  { signal, timeoutMs = 4000 }: { signal: AbortSignal; timeoutMs?: number },
): Promise<ImageReadiness[]> {
  return Promise.all(
    images.map(
      (image) =>
        new Promise<ImageReadiness>((resolve) => {
          let finished = false;
          let decoding = false;
          let timer: ReturnType<typeof setTimeout> | undefined;
          const finish = (state: ImageReadiness) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            image.removeEventListener("load", loaded);
            image.removeEventListener("error", failed);
            signal.removeEventListener("abort", aborted);
            resolve(state);
          };
          const failed = () => finish("failed");
          const aborted = () => finish("aborted");
          const loaded = () => {
            if (finished || decoding) return;
            if (!image.naturalWidth) {
              failed();
              return;
            }
            decoding = true;
            if (!image.decode) {
              finish("ready");
              return;
            }
            Promise.resolve()
              .then(() => image.decode!())
              .then(
                () => finish(image.naturalWidth ? "ready" : "failed"),
                () =>
                  finish(
                    image.complete && image.naturalWidth ? "ready" : "failed",
                  ),
              );
          };
          if (signal.aborted) {
            aborted();
            return;
          }
          image.addEventListener("load", loaded);
          image.addEventListener("error", failed);
          signal.addEventListener("abort", aborted, { once: true });
          timer = setTimeout(() => finish("timeout"), timeoutMs);
          if (image.complete) loaded();
        }),
    ),
  );
}
