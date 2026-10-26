// Separate photographs let the collage recompose on smaller screens without
// cropping a baked-in montage or covering the central reading area.
const photographs = [
  { id: "garden", width: 960, height: 1200 },
  { id: "chairs", width: 1067, height: 1600 },
  { id: "beach", width: 736, height: 1060 },
];

export function DropCollage() {
  return (
    <div className="ps-collage" aria-hidden="true">
      {photographs.map(({ id, width, height }) => (
        <div className={`ps-photo-stack ps-photo-stack-${id}`} key={id}>
          <div className="ps-collage-photo">
            <img
              src={`/media/ensaio-drop/collage-${id}-v1-800.webp`}
              srcSet={`/media/ensaio-drop/collage-${id}-v1-480.webp 480w, /media/ensaio-drop/collage-${id}-v1-800.webp 800w`}
              sizes="(max-width: 760px) 39vw, 28vw"
              alt=""
              width={width}
              height={height}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
