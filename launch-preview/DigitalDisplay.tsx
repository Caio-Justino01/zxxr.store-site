import { countdownParts } from "./launch-state.ts";

const shapes = [
  "7,2 27,2 31,6 27,10 7,10 3,6",
  "28,11 32,7 35,11 35,27 31,31 27,27",
  "31,33 35,37 35,53 32,57 28,53 27,37",
  "7,54 27,54 31,58 27,62 7,62 3,58",
  "2,33 6,37 6,53 2,57 0,53 0,37",
  "2,7 6,11 6,27 2,31 0,27 0,11",
  "7,28 27,28 31,32 27,36 7,36 3,32",
];
const segments: Record<string, number[]> = {
  "0": [0, 1, 2, 3, 4, 5],
  "1": [1, 2],
  "2": [0, 1, 6, 4, 3],
  "3": [0, 1, 2, 3, 6],
  "4": [5, 6, 1, 2],
  "5": [0, 5, 6, 2, 3],
  "6": [0, 5, 4, 3, 2, 6],
  "7": [0, 1, 2],
  "8": [0, 1, 2, 3, 4, 5, 6],
  "9": [0, 1, 2, 3, 5, 6],
  "-": [6],
};

export function DigitalDisplay({ seconds }: { seconds: number | null }) {
  const parts =
    seconds === null
      ? { hours: "--", minutes: "--", seconds: "--" }
      : countdownParts(seconds);
  const text = `${parts.hours}:${parts.minutes}:${parts.seconds}`;
  let x = 0;
  const symbols = [...text].map((character, i) => {
    const position = x;
    x += character === ":" ? 17 : 43;
    return character === ":" ? (
      <g key={i} transform={`translate(${position},0)`} className="digit-on">
        <circle cx="5" cy="22" r="3" />
        <circle cx="5" cy="43" r="3" />
      </g>
    ) : (
      <g key={i} transform={`translate(${position},0)`}>
        {shapes.map((points, index) =>
          segments[character]?.includes(index) ? (
            <polygon key={index} points={points} className="digit-on" />
          ) : null,
        )}
      </g>
    );
  });
  return (
    <div
      className="clock-display"
      role="timer"
      aria-live="off"
      aria-label={
        seconds === null
          ? "Sincronizando contagem"
          : `${Number(parts.hours)} horas, ${Number(parts.minutes)} minutos e ${Number(parts.seconds)} segundos para a abertura`
      }
      data-time={text}
    >
      <svg
        viewBox={`-2 -1 ${x - 4} 66`}
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        {symbols}
      </svg>
    </div>
  );
}
