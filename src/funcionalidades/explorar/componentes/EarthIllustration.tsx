// Ilustración vectorial original: no es cartografía ni una observación satelital.
export function EarthIllustration({ escala = 1 }: { escala?: number }) {
  return <div className="earth-illustration" style={{ transform: `scale(${escala})` }}><svg viewBox="0 0 600 600" role="img" aria-label="Ilustración conceptual de la Tierra con América y un punto de referencia en México">
    <defs>
      <radialGradient id="ocean" cx="35%" cy="28%" r="75%"><stop stopColor="#32798d"/><stop offset=".42" stopColor="#153a52"/><stop offset=".82" stopColor="#081828"/><stop offset="1" stopColor="#030811"/></radialGradient>
      <linearGradient id="land" x2="1" y2="1"><stop stopColor="#899c7c"/><stop offset=".45" stopColor="#647b62"/><stop offset="1" stopColor="#173a38"/></linearGradient>
      <radialGradient id="shade" cx="28%" cy="32%" r="72%"><stop offset=".25" stopColor="#000" stopOpacity="0"/><stop offset=".75" stopColor="#020710" stopOpacity=".3"/><stop offset="1" stopColor="#01040b" stopOpacity=".94"/></radialGradient>
      <filter id="terrain"><feTurbulence type="fractalNoise" baseFrequency=".075" numOctaves="5" seed="12"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="soft-light"/></filter>
      <clipPath id="sphere"><circle cx="300" cy="300" r="272"/></clipPath>
    </defs>
    <circle cx="300" cy="300" r="276" fill="#315e79" opacity=".2"/><g clipPath="url(#sphere)"><circle cx="300" cy="300" r="272" fill="url(#ocean)"/>
    <g fill="url(#land)" filter="url(#terrain)"><path d="M58 130 83 90 157 57 196 60 224 43 274 58 299 86 337 102 361 133 344 165 315 178 300 203 277 212 271 239 246 245 235 274 216 283 211 306 234 330 257 341 271 360 287 362 296 378 281 385 264 369 247 367 224 350 208 328 196 311 184 281 168 266 158 236 137 223 122 197 105 193 88 164 64 160Z"/><path d="m164 274 14 10 14 33 6 18-11-9-13-25Z"/><path d="m295 379 28-14 23 9 17 23 30 9 26 29-11 38-23 20-13 44-25 38-18 21-11-19 5-34-9-29-15-22-9-35-15-29Z"/><path d="m268 38 48 2 29 16-7 36-23 16-27-20-17-27Z"/><path d="m397 105 42-8 36 24 28 35 31 56-13 24-32-9-18-28-27-16-28-32Z"/><path d="m265 330 24 2 17 8-12 4-27-7Z"/></g>
    <g fill="none" stroke="#90c7dc" strokeOpacity=".1" strokeWidth=".8"><ellipse cx="300" cy="300" rx="160" ry="272"/><ellipse cx="300" cy="300" rx="245" ry="272"/><ellipse cx="300" cy="300" rx="272" ry="95"/><ellipse cx="300" cy="300" rx="272" ry="191"/><path d="M28 300h544M300 28v544"/></g>
    <circle cx="300" cy="300" r="272" fill="url(#shade)"/>
    <g fill="none" stroke="#68e0cd"><circle cx="224" cy="321" r="23" opacity=".2"/><circle cx="224" cy="321" r="14" opacity=".6"/><circle cx="224" cy="321" r="5" fill="#8ff4da" stroke="none"/><path d="m237 314 38-25h65" strokeWidth=".8" opacity=".8"/></g><text x="284" y="280" fill="#bcf2e5" fontSize="10" letterSpacing="3">MÉXICO</text></g>
    <circle cx="300" cy="300" r="272" fill="none" stroke="#83c3df" strokeOpacity=".3"/>
  </svg></div>
}
