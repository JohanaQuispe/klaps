import resvg_py
import os

svg_content = """<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#0b1120" />
    </linearGradient>

    <!-- Card Gradients -->
    <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#132337" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0d1829" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="cardGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e1839" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#130e26" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="cardGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#15283c" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0f1d2e" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="cardGrad4" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2a162b" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#1c0d1e" stop-opacity="0.95" />
    </linearGradient>

    <!-- Header Gradients -->
    <linearGradient id="col1Head" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="col2Head" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="col3Head" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="col4Head" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#db2777" />
      <stop offset="100%" stop-color="#e11d48" />
    </linearGradient>

    <!-- Glow & Border filters -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Arrow Marker -->
    <marker id="arrowCyan" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
    </marker>
    <marker id="arrowPurple" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#a855f7" />
    </marker>
    <marker id="arrowRose" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#fb7185" />
    </marker>
  </defs>

  <style>
    .title { font-family: 'DejaVu Sans', sans-serif; font-weight: bold; fill: #ffffff; }
    .subtitle { font-family: 'DejaVu Sans', sans-serif; fill: #94a3b8; }
    .badge { font-family: 'DejaVu Sans', sans-serif; font-weight: bold; fill: #ffffff; }
    .col-title { font-family: 'DejaVu Sans', sans-serif; font-weight: bold; font-size: 19px; fill: #ffffff; }
    .col-sub { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; fill: #cbd5e1; }
    .box-title { font-family: 'DejaVu Sans', sans-serif; font-weight: bold; font-size: 14px; fill: #f8fafc; }
    .box-text { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; fill: #94a3b8; }
    .highlight-cyan { fill: #38bdf8; font-weight: bold; }
    .highlight-purple { fill: #c084fc; font-weight: bold; }
    .highlight-amber { fill: #fbbf24; font-weight: bold; }
    .highlight-emerald { fill: #34d399; font-weight: bold; }
    .highlight-rose { fill: #fb7185; font-weight: bold; }
    .tag { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; font-weight: bold; }
  </style>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#bgGrad)" />

  <!-- Subtle Tech Grid Pattern Lines -->
  <path d="M 0 140 L 1920 140 M 0 990 L 1920 990" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="6,6" />

  <!-- TOP HEADER -->
  <!-- Project Logo / Icon Box -->
  <rect x="50" y="32" width="76" height="76" rx="18" fill="#7c3aed" />
  <rect x="52" y="34" width="72" height="72" rx="16" fill="#6d28d9" stroke="#a78bfa" stroke-width="1.5" />
  <text x="88" y="77" font-family="'DejaVu Sans', sans-serif" font-weight="bold" font-size="28" fill="#ffffff" text-anchor="middle">K</text>
  <circle cx="108" cy="48" r="6" fill="#38bdf8" />

  <!-- Titles -->
  <text x="144" y="62" class="title" font-size="26" letter-spacing="1">ARQUITECTURA DEL SISTEMA CIBERFÍSICO DISTRIBUIDO</text>
  <text x="144" y="92" class="subtitle" font-size="14">KLAPS · Sistema Inteligente de Comunicación Asistida con ESP32, BLE y Clasificación KNN en Tiempo Real</text>

  <!-- Academic Banner (Right) -->
  <rect x="1390" y="32" width="480" height="76" rx="14" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
  <rect x="1405" y="44" width="38" height="52" rx="6" fill="#f59e0b" />
  <text x="1424" y="76" font-family="'DejaVu Sans', sans-serif" font-weight="bold" font-size="20" fill="#0f172a" text-anchor="middle">UPN</text>
  <text x="1455" y="58" class="badge" font-size="13" fill="#ffffff">UNIVERSIDAD PRIVADA DEL NORTE</text>
  <text x="1455" y="76" class="box-text" font-size="12" fill="#94a3b8">Facultad de Ingeniería · Arquitectura del Computador</text>
  <text x="1455" y="93" class="highlight-amber" font-size="11">Docente: Mg. Gustavo Paz Purizaca · 2026-2</text>

  <!-- KEY METRICS BAR -->
  <rect x="50" y="126" width="1820" height="34" rx="8" fill="#111827" stroke="#1f2937" stroke-width="1" />
  
  <circle cx="75" cy="143" r="5" fill="#34d399" />
  <text x="88" y="147" class="badge" font-size="12" fill="#34d399">Latencia End-to-End: 34.3 ms</text>
  
  <line x1="285" y1="134" x2="285" y2="152" stroke="#374151" stroke-width="1" />
  <circle cx="310" cy="143" r="5" fill="#38bdf8" />
  <text x="323" y="147" class="badge" font-size="12" fill="#38bdf8">Exactitud de Clasificación: 94.0%</text>

  <line x1="565" y1="134" x2="565" y2="152" stroke="#374151" stroke-width="1" />
  <circle cx="590" cy="143" r="5" fill="#c084fc" />
  <text x="603" y="147" class="badge" font-size="12" fill="#c084fc">Trama Binaria Little-Endian: 34 Bytes contiguos @ 20 Hz</text>

  <line x1="1000" y1="134" x2="1000" y2="152" stroke="#374151" stroke-width="1" />
  <circle cx="1025" cy="143" r="5" fill="#fbbf24" />
  <text x="1038" y="147" class="badge" font-size="12" fill="#fbbf24">Caudal Inalámbrico: 680 Bytes/s (Ultra bajo consumo &lt; 20 mA)</text>

  <line x1="1475" y1="134" x2="1475" y2="152" stroke="#374151" stroke-width="1" />
  <circle cx="1500" cy="143" r="5" fill="#f43f5e" />
  <text x="1513" y="147" class="badge" font-size="12" fill="#f43f5e">Arquitectura Zero-Install: Web Bluetooth sobre HTTPS en Vercel</text>

  <!-- ======================================================== -->
  <!-- COLUMN 1: HARDWARE & CAPTURA SENSORIAL                   -->
  <!-- ======================================================== -->
  <g transform="translate(50, 180)">
    <!-- Column Outer Card -->
    <rect width="425" height="785" rx="16" fill="url(#cardGrad1)" stroke="#0e7490" stroke-width="1.8" />
    
    <!-- Column Header -->
    <rect width="425" height="54" rx="16" fill="url(#col1Head)" />
    <rect y="38" width="425" height="16" fill="url(#col1Head)" />
    <text x="20" y="34" class="col-title">1. CAPA DE SENSORES Y HARDWARE</text>
    <text x="20" y="48" class="col-sub">Adquisición mecánica, inercial y acondicionamiento</text>

    <!-- Subcard 1: Sensores de Flexión -->
    <g transform="translate(18, 70)">
      <rect width="389" height="210" rx="12" fill="#091424" stroke="#164e63" stroke-width="1.2" />
      <rect x="14" y="12" width="70" height="20" rx="6" fill="#155e75" />
      <text x="49" y="26" class="tag" fill="#67e8f9" text-anchor="middle">5 DEDOS</text>
      <text x="94" y="27" class="box-title">Sensores de Flexión Resistivos 2.2"</text>
      
      <text x="16" y="55" class="box-text">• Resistencia: 10 kΩ (plano) → 60..100 kΩ (doblado)</text>
      <text x="16" y="75" class="box-text">• 5 Divisores de Tensión pasivos con R = 10 kΩ / 47 kΩ</text>
      
      <!-- Critical hardware architecture box -->
      <rect x="12" y="92" width="365" height="104" rx="8" fill="#132e3d" stroke="#0891b2" stroke-width="1" />
      <text x="22" y="112" class="highlight-cyan" font-size="12">RESTRICCIÓN CRÍTICA DE ARQUITECTURA:</text>
      <text x="22" y="132" class="box-text" font-size="11.5">• Ruteo EXCLUSIVO a canales del <tspan fill="#38bdf8" font-weight="bold">ADC1</tspan> de 12 bits</text>
      <text x="22" y="150" class="box-text" font-size="11.5">• Pines: <tspan fill="#67e8f9">GPIO 36 (VP), 39 (VN), 34, 35 y 32</tspan></text>
      <text x="22" y="170" class="box-text" font-size="11">• <tspan fill="#f87171" font-weight="bold">ADC2 inhabilitado:</tspan> colisiona por hardware con la radio BLE</text>
      <text x="22" y="186" class="box-text" font-size="11">• Tensión calibrada en rango lineal: 0.36 V a 0.94 V</text>
    </g>

    <!-- Subcard 2: IMU MPU-6050 -->
    <g transform="translate(18, 296)">
      <rect width="389" height="180" rx="12" fill="#091424" stroke="#164e63" stroke-width="1.2" />
      <rect x="14" y="12" width="60" height="20" rx="6" fill="#0369a1" />
      <text x="44" y="26" class="tag" fill="#7dd3fc" text-anchor="middle">6-DOF</text>
      <text x="84" y="27" class="box-title">Unidad Inercial IMU MPU-6050</text>
      
      <text x="16" y="55" class="box-text">• Ubicación anatómica: Dorso de la mano</text>
      <text x="16" y="75" class="box-text">• Acelerómetro triaxial: ±2g (ax, ay, az en m/s²)</text>
      <text x="16" y="95" class="box-text">• Giroscopio triaxial: ±250°/s (gx, gy, gz en rad/s)</text>
      <text x="16" y="118" class="box-text">• Protocolo de bus: <tspan fill="#38bdf8" font-weight="bold">I²C a 400 kHz Fast Mode</tspan></text>
      <text x="16" y="138" class="box-text">• Pines dedicados: <tspan fill="#67e8f9">SDA (GPIO 21) · SCL (GPIO 22)</tspan></text>
      <text x="16" y="158" class="box-text">• Inversión az (-9.8 m/s²): Detección física mano en reposo</text>
    </g>

    <!-- Subcard 3: Energía y Montaje -->
    <g transform="translate(18, 492)">
      <rect width="389" height="150" rx="12" fill="#091424" stroke="#164e63" stroke-width="1.2" />
      <rect x="14" y="12" width="82" height="20" rx="6" fill="#0e7490" />
      <text x="55" y="26" class="tag" fill="#67e8f9" text-anchor="middle">POTENCIA</text>
      <text x="106" y="27" class="box-title">Alimentación y Chasis Ergonómico</text>
      
      <text x="16" y="54" class="box-text">• Alimentación cableada micro-USB 5V (laboratorio / debug)</text>
      <text x="16" y="74" class="box-text">• Circuito portátil: Batería LiPo 3.7V (1000 mAh)</text>
      <text x="16" y="94" class="box-text">• Módulo TP4056 (carga USB-C) + Step-Up MT3608 (5V)</text>
      <text x="16" y="114" class="box-text">• Cables de silicona calibre 26 AWG (alta flexibilidad)</text>
      <text x="16" y="132" class="box-text">• Guante textil elástico transpirable + muñequera velcro</text>
    </g>

    <!-- Subcard 4: Resumen de flujo columna 1 -->
    <g transform="translate(18, 656)">
      <rect width="389" height="110" rx="10" fill="#061f2e" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="4,4" />
      <text x="20" y="30" class="highlight-cyan" font-size="12">SALIDAS HACIA EL MICROCONTROLADOR:</text>
      <text x="20" y="52" class="box-text" font-size="11.5">• 5 Canales analógicos continuos de voltaje (0..3.3 V)</text>
      <text x="20" y="72" class="box-text" font-size="11.5">• 1 Bus digital síncrono I²C (ráfaga de 14 bytes de telemetría)</text>
      <text x="20" y="92" class="box-text" font-size="11.5">• Aislamiento galvánico y filtrado pasivo de ruido mecánico</text>
    </g>
  </g>

  <!-- Connective Arrow 1 -> 2 -->
  <line x1="480" y1="570" x2="520" y2="570" stroke="#38bdf8" stroke-width="3" marker-end="url(#arrowCyan)" />
  <rect x="477" y="535" width="46" height="24" rx="4" fill="#0f172a" stroke="#0284c7" stroke-width="1" />
  <text x="500" y="551" class="tag" fill="#38bdf8" text-anchor="middle" font-size="9">ADC/I²C</text>

  <!-- ======================================================== -->
  <!-- COLUMN 2: MICROCONTROLADOR EMBEBIDO ESP32                -->
  <!-- ======================================================== -->
  <g transform="translate(530, 180)">
    <!-- Column Outer Card -->
    <rect width="425" height="785" rx="16" fill="url(#cardGrad2)" stroke="#7c3aed" stroke-width="1.8" />
    
    <!-- Column Header -->
    <rect width="425" height="54" rx="16" fill="url(#col2Head)" />
    <rect y="38" width="425" height="16" fill="url(#col2Head)" />
    <text x="20" y="34" class="col-title">2. PROCESAMIENTO EMBEBIDO ESP32</text>
    <text x="20" y="48" class="col-sub">Gestión dual-core, empaquetado binario y pila BLE</text>

    <!-- Subcard 1: ESP32 Hardware Specs -->
    <g transform="translate(18, 70)">
      <rect width="389" height="195" rx="12" fill="#140f28" stroke="#4c1d95" stroke-width="1.2" />
      <rect x="14" y="12" width="75" height="20" rx="6" fill="#5b21b6" />
      <text x="51" y="26" class="tag" fill="#d8b4fe" text-anchor="middle">DUAL CORE</text>
      <text x="98" y="27" class="box-title">ESP32 DevKit V1 (Xtensa LX6)</text>
      
      <text x="16" y="55" class="box-text">• Arquitectura: 32 bits a 240 MHz (Dual-Core)</text>
      <text x="16" y="75" class="box-text">• Memoria: 520 KB SRAM · 4 MB Flash SPI</text>
      
      <rect x="12" y="90" width="365" height="92" rx="8" fill="#201540" stroke="#7c3aed" stroke-width="1" />
      <text x="22" y="110" class="highlight-purple" font-size="12">DESACOPLAMIENTO DE NÚCLEOS (FreeRTOS):</text>
      <text x="22" y="130" class="box-text" font-size="11.5">• <tspan fill="#c084fc" font-weight="bold">CORE 1 (Procesamiento Sensorial):</tspan> Muestreo periódico</text>
      <text x="32" y="148" class="box-text" font-size="11">a 20 Hz (T = 50 ms), lectura ADC1 y calibración lineal.</text>
      <text x="22" y="168" class="box-text" font-size="11.5">• <tspan fill="#c084fc" font-weight="bold">CORE 0 (Comunicaciones):</tspan> Notificaciones de la pila BLE.</text>
    </g>

    <!-- Subcard 2: Estructura de Trama Binaria -->
    <g transform="translate(18, 280)">
      <rect width="389" height="210" rx="12" fill="#140f28" stroke="#4c1d95" stroke-width="1.2" />
      <rect x="14" y="12" width="75" height="20" rx="6" fill="#4c1d95" />
      <text x="51" y="26" class="tag" fill="#e9d5ff" text-anchor="middle">34 BYTES</text>
      <text x="98" y="27" class="box-title">Trama Binaria Little-Endian</text>
      
      <text x="16" y="52" class="box-text">Empaquetado directo en memoria struct __attribute__((packed)):</text>
      
      <rect x="12" y="66" width="365" height="130" rx="8" fill="#100b21" stroke="#6d28d9" stroke-width="1" />
      
      <rect x="20" y="78" width="105" height="22" rx="4" fill="#2e1065" />
      <text x="72" y="93" class="tag" fill="#c084fc" text-anchor="middle">Bytes 00 - 09</text>
      <text x="135" y="93" class="box-text" font-size="11.5">5 × int16_t · Flexión dedos (0..100 %)</text>

      <rect x="20" y="106" width="105" height="22" rx="4" fill="#2e1065" />
      <text x="72" y="121" class="tag" fill="#c084fc" text-anchor="middle">Bytes 10 - 21</text>
      <text x="135" y="121" class="box-text" font-size="11.5">3 × float32 · Aceleración (ax, ay, az)</text>

      <rect x="20" y="134" width="105" height="22" rx="4" fill="#2e1065" />
      <text x="72" y="149" class="tag" fill="#c084fc" text-anchor="middle">Bytes 22 - 33</text>
      <text x="135" y="149" class="box-text" font-size="11.5">3 × float32 · Giroscopio (gx, gy, gz)</text>

      <text x="22" y="180" class="highlight-amber" font-size="11">VENTAJA: 34B vs &gt;180B de JSON (Ahorro de 81% de ancho de banda)</text>
    </g>

    <!-- Subcard 3: BLE GATT Server -->
    <g transform="translate(18, 506)">
      <rect width="389" height="160" rx="12" fill="#140f28" stroke="#4c1d95" stroke-width="1.2" />
      <rect x="14" y="12" width="70" height="20" rx="6" fill="#6d28d9" />
      <text x="49" y="26" class="tag" fill="#f3e8ff" text-anchor="middle">BLE 4.2</text>
      <text x="94" y="27" class="box-title">Servidor Bluetooth Low Energy (GATT)</text>
      
      <text x="16" y="54" class="box-text">• Nombre anunciado: <tspan fill="#a855f7" font-weight="bold">KLAPS_Guante_D</tspan> / <tspan fill="#a855f7" font-weight="bold">KLAPS_Guante_I</tspan></text>
      <text x="16" y="74" class="box-text">• Servicio GATT UUID: <tspan fill="#d8b4fe" font-size="10.5">6e400001-b5a3-f393-e0a9-e50e24dcca9e</tspan></text>
      <text x="16" y="94" class="box-text">• Característica Sensores: <tspan fill="#d8b4fe" font-size="10.5">6e400002-... (Propiedad NOTIFY)</tspan></text>
      <text x="16" y="116" class="box-text">• Cadencia de notificación: <tspan fill="#34d399" font-weight="bold">20 Hz (un paquete cada 50 ms)</tspan></text>
      <text x="16" y="136" class="box-text">• Consumo energético en transmisión: <tspan fill="#38bdf8">18 a 22 mA</tspan></text>
    </g>

    <!-- Subcard 4: Diagnóstico y Seguridad Embebida -->
    <g transform="translate(18, 680)">
      <rect width="389" height="86" rx="10" fill="#23133d" stroke="#8b5cf6" stroke-width="1.2" stroke-dasharray="4,4" />
      <text x="20" y="28" class="highlight-purple" font-size="12">ROBUSTEZ Y CALIBRACIÓN EN SILICIO:</text>
      <text x="20" y="50" class="box-text" font-size="11.5">• Monitor serie a 115200 baudios con telemetría en vivo</text>
      <text x="20" y="68" class="box-text" font-size="11.5">• Mapeo analógico precalibrado contra saturación (ADC_BENT)</text>
    </g>
  </g>

  <!-- Connective Arrow 2 -> 3 -->
  <line x1="960" y1="570" x2="1000" y2="570" stroke="#a855f7" stroke-width="3" marker-end="url(#arrowPurple)" />
  <rect x="955" y="535" width="50" height="24" rx="4" fill="#0f172a" stroke="#7c3aed" stroke-width="1" />
  <text x="980" y="551" class="tag" fill="#c084fc" text-anchor="middle" font-size="9">BLE 20Hz</text>

  <!-- ======================================================== -->
  <!-- COLUMN 3: CLIENTE WEB & INFERENCIA KNN                   -->
  <!-- ======================================================== -->
  <g transform="translate(1010, 180)">
    <!-- Column Outer Card -->
    <rect width="425" height="785" rx="16" fill="url(#cardGrad3)" stroke="#0284c7" stroke-width="1.8" />
    
    <!-- Column Header -->
    <rect width="425" height="54" rx="16" fill="url(#col3Head)" />
    <rect y="38" width="425" height="16" fill="url(#col3Head)" />
    <text x="20" y="34" class="col-title">3. CLIENTE WEB &amp; CLASIFICADOR KNN</text>
    <text x="20" y="48" class="col-sub">PWA React, Web Bluetooth y aprendizaje automático</text>

    <!-- Subcard 1: PWA en Vercel -->
    <g transform="translate(18, 70)">
      <rect width="389" height="185" rx="12" fill="#0c1b2b" stroke="#075985" stroke-width="1.2" />
      <rect x="14" y="12" width="70" height="20" rx="6" fill="#0369a1" />
      <text x="49" y="26" class="tag" fill="#bae6fd" text-anchor="middle">VERCEL</text>
      <text x="94" y="27" class="box-title">Progressive Web App (React + Vite)</text>
      
      <text x="16" y="54" class="box-text">• Alojamiento: <tspan fill="#38bdf8" font-weight="bold">Vercel Edge Network</tspan> con SSL global</text>
      <text x="16" y="74" class="box-text">• Contexto seguro: <tspan fill="#34d399" font-weight="bold">HTTPS obligatorio</tspan> para Web Bluetooth</text>
      <text x="16" y="94" class="box-text">• Compatibilidad: Chrome (Android y PC), Edge, Opera</text>
      
      <rect x="12" y="108" width="365" height="64" rx="8" fill="#132a42" stroke="#0284c7" stroke-width="1" />
      <text x="22" y="128" class="highlight-cyan" font-size="12">DESEMPAQUETADO BINARIO (JavaScript DataView):</text>
      <text x="22" y="146" class="box-text" font-size="11.5">• Decodificación instantánea en memoria (&lt; 0.5 ms de CPU)</text>
      <text x="22" y="162" class="box-text" font-size="11">• Sin sobrecarga de serialización JSON ni pérdida de paquetes</text>
    </g>

    <!-- Subcard 2: Calibración y Cinemática Asistida -->
    <g transform="translate(18, 270)">
      <rect width="389" height="195" rx="12" fill="#0c1b2b" stroke="#075985" stroke-width="1.2" />
      <rect x="14" y="12" width="78" height="20" rx="6" fill="#0284c7" />
      <text x="53" y="26" class="tag" fill="#e0f2fe" text-anchor="middle">BIOMECÁNICA</text>
      <text x="100" y="27" class="box-title">Calibración Guiada &amp; Cinemática</text>
      
      <text x="16" y="54" class="box-text">• <tspan fill="#38bdf8" font-weight="bold">Calibración Guiada Rápida (3 segundos):</tspan></text>
      <text x="26" y="72" class="box-text" font-size="11">- Paso 1: Mano extendida en reposo (captura f_min)</text>
      <text x="26" y="90" class="box-text" font-size="11">- Paso 2: Puño cerrado (captura f_max)</text>
      <text x="26" y="108" class="box-text" font-size="11">- Almacenamiento local persistente en <tspan fill="#67e8f9">localStorage</tspan></text>

      <text x="16" y="132" class="box-text">• <tspan fill="#38bdf8" font-weight="bold">Cinemática Asistida Adaptativa:</tspan></text>
      <text x="26" y="150" class="box-text" font-size="11">- Modelado de sinergia muscular para articulaciones</text>
      <text x="26" y="168" class="box-text" font-size="11">- Visualización suave y natural de los 5 dedos en pantalla</text>
    </g>

    <!-- Subcard 3: Clasificador KNN -->
    <g transform="translate(18, 480)">
      <rect width="389" height="205" rx="12" fill="#0c1b2b" stroke="#075985" stroke-width="1.2" />
      <rect x="14" y="12" width="55" height="20" rx="6" fill="#0369a1" />
      <text x="41" y="26" class="tag" fill="#bae6fd" text-anchor="middle">KNN</text>
      <text x="78" y="27" class="box-title">Algoritmo K-Nearest Neighbors</text>
      
      <text x="16" y="52" class="box-text">• Inferencia en JavaScript puro en el navegador del usuario</text>
      <text x="16" y="72" class="box-text">• Vector de características: <tspan fill="#34d399" font-weight="bold">22 dimensiones</tspan> normalizadas</text>
      <text x="26" y="90" class="box-text" font-size="11">(Flexión 5 dedos + aceleración + velocidad angular + rotación)</text>
      
      <text x="16" y="114" class="box-text">• Distancia euclidiana con <tspan fill="#fbbf24" font-weight="bold">pesos ponderados:</tspan></text>
      <text x="26" y="132" class="box-text" font-size="11">- w_flex = 0.70 · w_acc = 2.50 · w_gyro = 3.20</text>
      
      <text x="16" y="154" class="box-text">• Hiperparámetro: <tspan fill="#38bdf8">K = 3 vecinos más cercanos</tspan></text>
      <text x="16" y="174" class="box-text">• Ventana de estabilidad temporal: <tspan fill="#34d399">600 ms (antirrebote)</tspan></text>
      <text x="16" y="194" class="box-text">• Umbral de confianza mínimo: <tspan fill="#67e8f9">80% para confirmar seña</tspan></text>
    </g>

    <!-- Subcard 4: Ventaja Arquitectural -->
    <g transform="translate(18, 700)">
      <rect width="389" height="66" rx="10" fill="#0e2a42" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="4,4" />
      <text x="20" y="26" class="highlight-cyan" font-size="12">VENTAJA ARQUITECTURAL DE INFERENCIA EN CLIENTE:</text>
      <text x="20" y="46" class="box-text" font-size="11.5">• Recalibración en caliente sin reflashear el microcontrolador</text>
    </g>
  </g>

  <!-- Connective Arrow 3 -> 4 -->
  <line x1="1440" y1="570" x2="1480" y2="570" stroke="#f43f5e" stroke-width="3" marker-end="url(#arrowRose)" />
  <rect x="1435" y="535" width="50" height="24" rx="4" fill="#0f172a" stroke="#e11d48" stroke-width="1" />
  <text x="1460" y="551" class="tag" fill="#fb7185" text-anchor="middle" font-size="9">EVENTOS</text>

  <!-- ======================================================== -->
  <!-- COLUMN 4: INTERFAZ, SÍNTESIS & CANAL SOS                 -->
  <!-- ======================================================== -->
  <g transform="translate(1490, 180)">
    <!-- Column Outer Card -->
    <rect width="380" height="785" rx="16" fill="url(#cardGrad4)" stroke="#be123c" stroke-width="1.8" />
    
    <!-- Column Header -->
    <rect width="380" height="54" rx="16" fill="url(#col4Head)" />
    <rect y="38" width="380" height="16" fill="url(#col4Head)" />
    <text x="20" y="34" class="col-title">4. INTERFAZ, VOZ &amp; AUXILIO SOS</text>
    <text x="20" y="48" class="col-sub">Salida accesible y canal de emergencia en la nube</text>

    <!-- Subcard 1: Síntesis de Voz -->
    <g transform="translate(16, 70)">
      <rect width="348" height="185" rx="12" fill="#1f0d1a" stroke="#881337" stroke-width="1.2" />
      <rect x="14" y="12" width="60" height="20" rx="6" fill="#be123c" />
      <text x="44" y="26" class="tag" fill="#fecdd3" text-anchor="middle">AUDIO</text>
      <text x="82" y="27" class="box-title">Síntesis de Voz (Web Speech TTS)</text>
      
      <text x="16" y="54" class="box-text">• Síntesis auditiva en tiempo real</text>
      <text x="16" y="74" class="box-text">• Motor: <tspan fill="#fb7185" font-weight="bold">Web Speech API nativa</tspan></text>
      <text x="16" y="94" class="box-text">• Idioma: Español (es-ES / es-PE)</text>
      <text x="16" y="114" class="box-text">• Reproducción por altavoz del celular o PC</text>
      <text x="16" y="136" class="box-text">• Verbalización instantánea de señas estáticas</text>
      <text x="26" y="154" class="box-text" font-size="11">(Vocales A, E, I, O, U y alfabeto)</text>
      <text x="16" y="172" class="box-text">• Soporte de señas dinámicas (movimiento)</text>
    </g>

    <!-- Subcard 2: Monitor de Telemetría -->
    <g transform="translate(16, 270)">
      <rect width="348" height="185" rx="12" fill="#1f0d1a" stroke="#881337" stroke-width="1.2" />
      <rect x="14" y="12" width="65" height="20" rx="6" fill="#9f1239" />
      <text x="46" y="26" class="tag" fill="#ffe4e6" text-anchor="middle">VISUAL</text>
      <text x="88" y="27" class="box-title">Interfaz de Usuario Adaptativa</text>
      
      <text x="16" y="54" class="box-text">• Monitor en vivo de flexión para los 5 dedos</text>
      <text x="16" y="74" class="box-text">• Indicador de conexión BLE con reconexión</text>
      <text x="16" y="94" class="box-text">• Historial continuo de traducción</text>
      <text x="16" y="114" class="box-text">• Botón de reseteo rápido a señas maestras</text>
      <text x="16" y="136" class="box-text">• Modo de alto contraste y accesibilidad</text>
      <text x="16" y="156" class="box-text">• Adaptable a pantallas móviles (Touch UX)</text>
      <text x="16" y="174" class="box-text">• Respuesta háptica y visual inmediata</text>
    </g>

    <!-- Subcard 3: Canal SOS Telegram -->
    <g transform="translate(16, 470)">
      <rect width="348" height="215" rx="12" fill="#1f0d1a" stroke="#881337" stroke-width="1.2" />
      <rect x="14" y="12" width="55" height="20" rx="6" fill="#e11d48" />
      <text x="41" y="26" class="tag" fill="#ffffff" text-anchor="middle">SOS</text>
      <text x="78" y="27" class="box-title">Canal de Auxilio Satelital (SOS)</text>
      
      <text x="16" y="54" class="box-text">• Activación gestual o agitación inercial:</text>
      <text x="26" y="72" class="box-text" font-size="11">Aceleración &gt; 18 m/s² sostenida por 4 s</text>
      
      <text x="16" y="94" class="box-text">• <tspan fill="#fb7185" font-weight="bold">Cuenta regresiva cancelable:</tspan> 10 segundos</text>
      <text x="26" y="112" class="box-text" font-size="11">Previene despachos accidentales o falsas alarmas</text>
      
      <rect x="12" y="126" width="324" height="74" rx="8" fill="#380d19" stroke="#f43f5e" stroke-width="1" />
      <text x="20" y="146" class="highlight-rose" font-size="11.5">SERVERLESS EDGE FUNCTION:</text>
      <text x="20" y="164" class="box-text" font-size="11">• Despacho HTTPS hacia <tspan fill="#ffffff" font-weight="bold">Telegram Bot API</tspan></text>
      <text x="20" y="182" class="box-text" font-size="11">• Envía mapa y coordenadas GPS en &lt; 1.8 s</text>
    </g>

    <!-- Subcard 4: Resumen de Seguridad -->
    <g transform="translate(16, 700)">
      <rect width="348" height="66" rx="10" fill="#3b0f20" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="4,4" />
      <text x="16" y="26" class="highlight-rose" font-size="12">SEGURIDAD CRÍTICA SERVERLESS:</text>
      <text x="16" y="46" class="box-text" font-size="11.5">• Token del bot protegido fuera del código cliente</text>
    </g>
  </g>

  <!-- ======================================================== -->
  <!-- BOTTOM FOOTER BAR                                        -->
  <!-- ======================================================== -->
  <g transform="translate(50, 985)">
    <rect width="1820" height="72" rx="12" fill="#0d1424" stroke="#1e293b" stroke-width="1.2" />
    
    <text x="24" y="32" class="badge" font-size="13" fill="#cbd5e1">AUTORES / INTEGRANTES:</text>
    <text x="24" y="54" class="box-text" font-size="12">Johana Carolina Quispe Ruiz · Camila Nadine Montalvo Abrego · Leoneld Mathias Sotelo Espinoza · Joselyn Ivana Tananta Arevalo</text>

    <text x="1000" y="32" class="badge" font-size="13" fill="#cbd5e1">METODOLOGÍA DE EVALUACIÓN Y RESULTADOS EXPERIMENTALES:</text>
    <text x="1000" y="54" class="box-text" font-size="12"><tspan fill="#34d399">Latencia Adquisición: 4.8 ms</tspan> | <tspan fill="#38bdf8">Trama: 1.2 ms</tspan> | <tspan fill="#c084fc">BLE: 14.5 ms</tspan> | <tspan fill="#fbbf24">Inferencia KNN: 1.8 ms</tspan> | <tspan fill="#fb7185">Render/Audio: 12.0 ms</tspan> | <tspan fill="#34d399" font-weight="bold">TOTAL: 34.3 ms</tspan></text>
  </g>
</svg>
"""

png_data = resvg_py.svg_to_bytes(svg_content)
output_path = "docs/informe/imagenes/arquitectura-sistema-klaps.png"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, "wb") as f:
    f.write(png_data)

print(f"Diagram successfully generated at {output_path}, size: {len(png_data)} bytes")
