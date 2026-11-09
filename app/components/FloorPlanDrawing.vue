<template>
  <svg viewBox="0 0 640 520" class="h-auto w-full" role="img" aria-labelledby="floor-plan-title" fill="none">
    <title id="floor-plan-title">兩房一廳的示意平面圖，非實際物件</title>
    <g>
      <rect x="40" y="90" width="320" height="210" fill="#fff" />
      <rect x="360" y="90" width="240" height="170" fill="#f6f8fa" />
      <rect x="40" y="300" width="200" height="180" fill="#f6f8fa" />
      <rect x="240" y="300" width="180" height="180" fill="#fff" />
      <rect x="420" y="260" width="180" height="220" fill="#dfe8f0" />
      <path d="M40 40h560v50H40z" fill="url(#plan-hatch)" />
    </g>
    <defs>
      <pattern id="plan-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0v12" stroke="#c1d2e1" stroke-width="2" />
      </pattern>
    </defs>
    <g stroke="#264566" stroke-linecap="square">
      <path stroke-width="7" d="M40 40h560v440H40z" />
      <path stroke-width="4" d="M40 90h120M240 90h240M560 90h40" />
      <path stroke-width="4" d="M360 90v90M360 250v50H300M230 300H40M240 300v70M240 440v40" />
      <path stroke-width="4" d="M360 260h60M490 260h110M420 260v130M420 450v30M420 370h180" />
    </g>
    <g stroke="#466f96" stroke-width="2">
      <path d="M360 180a70 70 0 0 1 70 70M360 180v70" />
      <path d="M240 370a70 70 0 0 1 70 70M240 370v70" />
      <path d="M420 390a60 60 0 0 1 60 60M420 390v60" />
      <path d="M160 90v-46M240 90a80 80 0 0 0-80-46" />
    </g>
    <g fill="#162a41" font-size="19" font-weight="600" text-anchor="middle">
      <text x="200" y="192">客餐廳</text>
      <text x="200" y="220" font-size="15" font-weight="400">LDK 14.5 帖</text>
      <text x="490" y="160">臥室</text>
      <text x="490" y="188" font-size="15" font-weight="400">7 帖</text>
      <text x="140" y="384">臥室</text>
      <text x="140" y="412" font-size="15" font-weight="400">5.5 帖</text>
      <text x="340" y="405">玄關</text>
      <text x="510" y="320">浴室</text>
      <text x="520" y="430">洗手間</text>
      <text x="320" y="71" font-size="15" font-weight="400">陽台</text>
    </g>
  </svg>
</template>
