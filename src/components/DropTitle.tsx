import { useId } from "react";
import "../drop-title.css";

// These contours are copied without changes from the approved black SVG assets.
// Only their masks move; the lettering and the tag keep their original geometry.
const lettering = [
  {
    id: "letter-n",
    d: "M10 270 Q29 168 51 63 L69 44 L88 53 Q103 123 128 207 Q145 114 181 24 Q174 124 150 267 L128 282 Q91 197 70 110 Q53 184 35 256 Z",
    reveal: "M22 270 L66 54 L134 265 L180 24",
    width: 100,
    transform: "",
  },
  {
    id: "letter-e",
    d: "M225 72 Q278 59 348 47 L340 70 Q291 82 250 88 L238 143 Q282 129 322 126 L314 149 Q277 158 234 170 L220 235 Q272 226 327 216 L319 243 Q270 259 192 274 Q210 177 225 72 Z",
    reveal: "M340 60 L236 79 L207 253 L320 229 M226 157 L316 137",
    width: 80,
    transform: "",
  },
  {
    id: "letter-w",
    d: "M353 68 L378 49 Q385 147 394 211 Q425 152 453 72 L470 43 Q481 151 505 210 Q542 126 588 29 Q567 143 526 255 L495 276 Q468 215 455 139 Q433 207 405 277 L376 269 Q356 176 353 68 Z",
    reveal: "M365 60 L389 259 L463 77 L509 253 L580 40",
    width: 100,
    transform: "",
  },
  {
    id: "letter-d",
    d: "M622 67 Q690 24 753 74 C805 122 786 216 729 255 Q689 282 592 278 L600 248 Q617 160 622 67 Z M648 91 L620 244 Q685 238 728 205 C768 169 763 106 719 88 Q685 77 648 91 Z",
    reveal: "M610 269 L638 83 C767 -1 849 260 610 269",
    width: 115,
    transform: "translate(55 0)",
  },
  {
    id: "letter-r",
    d: "M818 71 Q887 46 948 35 Q959 33 956 47 Q937 87 853 132 L858 147 Q891 144 914 136 L969 245 L947 260 L882 172 L849 181 L839 266 L819 283 L826 184 Q797 181 785 173 L788 157 L830 163 L835 83 L817 88 Z M858 78 L854 112 Q900 85 924 65 Q891 69 858 78 Z",
    reveal: "M829 278 L846 77 L945 46 L845 136 M793 169 L894 156 L961 253",
    width: 100,
    transform: "translate(55 0)",
  },
  {
    id: "letter-o",
    d: "M1064 49 C1119 37 1140 82 1122 151 Q1100 230 1042 263 C1009 284 978 275 975 241 Q969 207 989 145 Q1011 71 1064 49 Z M1061 78 Q1034 86 1014 142 Q990 208 1004 238 Q1017 253 1046 230 Q1080 201 1096 144 Q1116 80 1083 75 Q1074 74 1061 78 Z",
    reveal: "M1068 63 C1147 52 1094 211 1039 252 C959 302 992 80 1068 63",
    width: 100,
    transform: "translate(55 0)",
  },
  {
    id: "letter-p",
    d: "M1160 74 Q1225 51 1295 46 Q1303 45 1295 58 Q1268 103 1197 138 L1187 256 L1166 277 L1163 158 Q1144 163 1130 165 L1137 146 L1166 140 Z M1197 89 L1195 111 Q1248 88 1263 67 Q1222 76 1197 89 Z",
    reveal: "M1176 275 L1178 88 L1292 52 L1180 137 L1137 156",
    width: 90,
    transform: "translate(55 0)",
  },
] as const;

const tag = [
  {
    id: "z",
    d: "M20.373 64.001 Q95.051 65.999 202.688 60.003 L204.814 59.885 L204.56 62 Q201.039 91.343 173.744 125.255 Q148.816 156.229 111.308 182.587 L38.85 232.878 Q125.908 249.986 188.6 270 C218.32 239 247.72 194 280.32 164 Q289.875 154.715 300.171 151.13 Q300.275 151.222 300.373 151.309 Q280.294 173.104 261.378 201.741 Q239.166 235.37 225.457 268.14 C221.306 275.828 217.133 283.786 212.96 292 Q109.557 266.96 -0.194 248.975 L-0.322 248.954 L-0.445 248.916 Q-5.456 247.356 -6.386 243.895 Q-7.599 239.388 -1.492 232.751 L-1.324 232.568 L94.059 164.409 L94.081 164.394 Q158.88 120.247 179.605 79.109 Q108.115 81.699 65.296 79.466 Q79.284 89.349 90.143 102.632 L91.163 103.879 L80.317 115.959 L78.897 114.459 Q50.882 84.866 18.176 78.97 L17.977 78.934 L17.794 78.857 Q12.405 76.592 12.297 72.986 Q12.173 68.854 19.13 64.362 L19.716 63.983 Z",
    reveal: "M22 72 L197 67 C184 120 99 181 14 241 L205 282 L276 175",
    width: 130,
    transform: "",
  },
  {
    id: "xx",
    d: "M258.04 58 C277.507 87.44 302.637 111.36 330.754 118.72 C364.962 100.32 395.157 65.36 415.469 37.76 C429.157 65.36 450.962 100.32 480.754 118.72 C510.637 111.36 541.507 87.44 568.04 58 C553.403 96.64 523.539 128.84 492 150 C514.357 180.36 534.726 227.28 542.427 271.44 C513.187 248.44 487.714 210.72 468.246 181.28 C444.499 220.84 412.758 268.68 384.998 291.68 C362.758 268.68 342.499 220.84 328.246 181.28 C301.714 210.72 267.187 248.44 232.427 271.44 C250.726 227.28 282.357 180.36 312 150 C285.539 128.84 263.403 96.64 258.04 58 Z M409.397 88.36 C392.747 110.44 367.766 135.28 348 150 C365.357 180.36 378.72 219 390.518 245.68 C408.72 219 431.357 180.36 456 150 C439.766 135.28 420.747 110.44 409.397 88.36 Z",
    reveal:
      "M260 61 C290 117 336 161 384 278 C424 245 476 165 558 64 M259 260 C314 205 361 121 414 47 C449 121 497 169 537 262",
    width: 160,
    transform: "",
  },
  {
    id: "r",
    d: "M573.943 88.061 Q671.892 64.044 785.361 44.032 Q792.428 42.877 794.02 45.881 Q795.782 49.206 789.876 56.176 L789.799 56.268 L789.712 56.351 Q752.324 92.417 619.72 155.071 L620.345 159.874 Q645.551 157.884 668.173 154.03 L669.355 153.828 L747.791 267.371 L728.124 280.628 L642.304 183.106 L620.874 185.745 L617.785 285.753 L599.089 302.446 L602.82 186.857 C573.783 181.492 536.741 167.046 503.548 151.656 Q503.424 151.472 503.312 151.309 Q504.566 150.396 505.805 149.468 C541.395 146.73 577.17 153.517 605.296 163.012 L604.725 96.521 L574.017 104.456 L571.95 88.55 Z M743.936 71.324 Q682.074 79.856 622.208 92.542 L624.648 132.002 Q693.952 98.824 743.936 71.324 Z",
    reveal: "M578 96 L783 50 L615 145 L607 289 M514 152 L655 168 L736 276",
    width: 140,
    transform: "",
  },
] as const;

/** The intro timeline animates each normalized mask from dashoffset 1 to 0. */
export function DropTitle({
  id = "collection-title",
  className = "",
}: {
  id?: string;
  className?: string;
}) {
  const maskId = `desejos-title-${useId().replace(/:/g, "")}`;

  return (
    <h1
      id={id}
      className={`dt-title ${className}`.trim()}
      aria-label="New Drop ZXXR · Desejos"
      tabIndex={-1}
    >
      <svg
        className="dt-lettering"
        viewBox="0 0 1380 310"
        width="1380"
        height="310"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {lettering.map((letter) => (
            <mask
              key={letter.id}
              id={`${maskId}-${letter.id}`}
              maskUnits="userSpaceOnUse"
              x="-100"
              y="-100"
              width="1580"
              height="510"
            >
              <path
                data-desejos-reveal="lettering"
                d={letter.reveal}
                fill="none"
                stroke="white"
                strokeWidth={letter.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset="0"
              />
            </mask>
          ))}
        </defs>
        <g fill="currentColor" fillRule="evenodd">
          {lettering.map((letter) => (
            <path
              key={letter.id}
              d={letter.d}
              transform={letter.transform || undefined}
              mask={`url(#${maskId}-${letter.id})`}
            />
          ))}
        </g>
      </svg>
      <svg
        className="dt-logo"
        viewBox="-26.587 17.76 856.587 342.24"
        width="856.587"
        height="342.24"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {tag.map((letter) => (
            <mask
              key={letter.id}
              id={`${maskId}-tag-${letter.id}`}
              maskUnits="userSpaceOnUse"
              x="-100"
              y="-100"
              width="1050"
              height="560"
            >
              <path
                data-desejos-reveal="tag"
                d={letter.reveal}
                fill="none"
                stroke="white"
                strokeWidth={letter.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset="0"
              />
            </mask>
          ))}
        </defs>
        <g fill="currentColor" fillRule="nonzero">
          {tag.map((letter) => (
            <path
              key={letter.id}
              d={letter.d}
              mask={`url(#${maskId}-tag-${letter.id})`}
            />
          ))}
        </g>
      </svg>
      <svg
        className="dt-underline"
        viewBox="0 0 1380 32"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <mask
            id={`${maskId}-underline`}
            maskUnits="userSpaceOnUse"
            x="-30"
            y="-30"
            width="1440"
            height="100"
          >
            <path
              data-desejos-underline
              d="M0 24 C375 12 950 20 1380 4"
              fill="none"
              stroke="white"
              strokeWidth="60"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="0"
            />
          </mask>
        </defs>
        <path
          fill="currentColor"
          mask={`url(#${maskId}-underline)`}
          d="M20 23 C380 8 930 12 1360 2 C945 24 404 27 43 31 Z"
        />
      </svg>
    </h1>
  );
}
