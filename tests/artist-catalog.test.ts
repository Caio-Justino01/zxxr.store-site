import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  artist,
  releases,
  releaseEmbedUrl,
  releaseUrl,
  releaseDateLabel,
} from "../src/config/artist.ts";

test("official catalog preserves the artist, featured release and collaborative credits", () => {
  assert.equal(artist.id, "3KuwSQKBjfgg0OnFi57bYN");
  assert.equal(new Set(releases.map((r) => r.id)).size, 3);
  const featured = releases.filter((r) => r.featured);
  assert.equal(featured.length, 1);
  assert.equal(featured[0].title, "ESCOLHAS");
  assert.equal(featured[0].releaseDate, "2026-09-20");
  assert.equal(featured[0].duration, "2:10");
  assert.equal(releaseDateLabel(featured[0]), "20/09/2026");
  assert.deepEqual(
    releases.find((r) => r.title === "emoção/controla")?.artists,
    ["diaz", "Razz"],
  );
});

test("each release opens its own official album player without autoplay", () => {
  for (const release of releases) {
    const embed = new URL(releaseEmbedUrl(release));
    assert.equal(embed.origin, "https://open.spotify.com");
    assert.equal(embed.pathname, `/embed/album/${release.id}`);
    assert.equal(embed.searchParams.has("autoplay"), false);
    assert.equal(
      new URL(releaseUrl(release)).pathname,
      `/intl-pt/album/${release.id}`,
    );
  }
});

test("all official cover files are local, square and at their native size", async () => {
  for (const release of releases) {
    const path = fileURLToPath(
      new URL(`../public${release.cover}`, import.meta.url),
    );
    const metadata = await sharp(path).metadata();
    assert.equal(metadata.width, 300);
    assert.equal(metadata.height, 300);
    assert.equal(new URL(release.coverSource).hostname, "i.scdn.co");
  }
});
