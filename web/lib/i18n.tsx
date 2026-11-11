import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

/*
 * Marketing-site copy (app/(home) and components/landing).
 * `en` defines the shape; `es` must match it key for key (enforced by the Dict type).
 */
const en = {
  nav: {
    product: "Product",
    trips: "Trip planning",
    security: "Security",
    selfHost: "Self-host",
    faq: "FAQ",
    docs: "Docs",
    signIn: "Sign in",
    getStarted: "Get started",
    openDashboard: "Open dashboard",
    menu: "Open menu",
    close: "Close menu",
    language: "Language",
    primary: "Primary",
  },
  common: {
    backHome: "Back home",
    goHome: "Go home",
    tryAgain: "Try again",
    lastUpdated: "Last updated",
    onThisPage: "On this page",
    questions: "Questions?",
    questionsBody: "Email us and we'll get back to you.",
  },
  hero: {
    badgeNew: "New",
    badge: "Trip planning with maps and routing",
    title1: "Business travel,",
    title2: "from route to reimbursement.",
    sub: "Expenn is free, open-source expense and travel management for teams. Plan multi-stop trips on a map, capture receipts in seconds, and approve and pay from one queue, all on your own servers.",
    ctaPrimary: "Get started",
    ctaDemo: "Live demo",
    ctaGithub: "Star on GitHub",
    points: ["Free and MIT licensed", "Self-hosted with Docker", "SSO ready"],
  },
  mock: {
    url: "expenn.example.com/trips/lisbon",
    trip: "Lisbon client visit",
    dates: "12–15 Mar",
    budget: "Budget",
    budgetValue: "€1,860 of €3,000",
    driving: "Car",
    cycling: "Bike",
    walking: "Walk",
    stops: ["Lisbon Airport (LIS)", "Client office, Parque das Nações", "Hotel, Baixa", "Team dinner, Belém"],
    legs: ["7.4 km · 16 min", "8.9 km · 19 min", "6.2 km · 14 min"],
    optimise: "Optimise order",
    search: "Search places",
    total: "3 legs · 22.5 km · 49 min",
    expenseTitle: "Taxi from airport",
    expenseAmount: "€32.40",
    expenseMeta: "Receipt attached",
    ready: "Ready",
    approved: "Approved",
    approvedMeta: "Hotel, 3 nights · €384.00",
    attribution: "© OpenStreetMap",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    label: "Illustration of the Expenn trip planner: a map with a four-stop route through Lisbon and the itinerary beside it.",
  },
  builtOn: {
    label: "Built on open foundations",
    items: ["OpenStreetMap", "OpenRouteService", "PostgreSQL", "S3-compatible storage", "OpenID Connect", "Docker Compose"],
  },
  how: {
    eyebrow: "How it works",
    title: "Four steps from receipt to money back.",
    sub: "Travelers capture, finance decides, everyone can see where things stand. No spreadsheets, no chasing.",
    steps: [
      { t: "Capture", d: "Snap a photo or drop a PDF. The receipt comes first and the form follows." },
      { t: "Submit", d: "Log it against the trip and send it for approval with one tap." },
      { t: "Approve", d: "Finance reviews everything in one queue, or sends it back with a reason." },
      { t: "Reimburse", d: "Mark it paid. Travelers always see what they're owed." },
    ],
  },
  trips: {
    eyebrow: "Trip planning",
    title1: "Plan every stop on a map.",
    title2: "Know every leg before you go.",
    sub: "Build multi-stop trips on an interactive map, compare routes for every way of getting around, and let Expenn find a better order. Each leg shows its distance and travel time, and the itinerary keeps dates and notes together.",
    routes: {
      title: "Compare routes",
      d: "Driving, cycling or walking, with alternatives side by side.",
      fastest: "Fastest",
      alternatives: "+2 alternatives",
      options: [
        { mode: "Driving", value: "22.5 km · 49 min" },
        { mode: "Cycling", value: "20.1 km · 1 h 18 min" },
        { mode: "Walking", value: "18.7 km · 3 h 52 min" },
      ],
    },
    optimise: {
      title: "Optimise stop order",
      d: "One click reorders your stops for the shortest trip.",
      before: "Your order",
      beforeValue: "28.8 km",
      after: "Optimised",
      afterValue: "22.5 km",
      saved: "−6.3 km",
    },
    itinerary: {
      title: "Itinerary by day",
      d: "Dates, times and notes for every stop.",
      days: [
        { day: "Mon 12", time: "09:40", place: "Arrive at LIS", note: "Taxi to the client office" },
        { day: "Mon 12", time: "11:00", place: "Client office", note: "Badge at reception" },
        { day: "Tue 13", time: "20:00", place: "Team dinner, Belém", note: "Table for 6" },
      ],
    },
    search: {
      title: "Search places",
      d: "Find addresses and venues, then add them as stops.",
      query: "Parque das",
      results: ["Parque das Nações, Lisbon", "Parque das Nações station", "Parque Eduardo VII"],
      add: "Add stop",
    },
    budget: {
      title: "Budgets and approvals",
      d: "Give every trip a budget and get travel approved before anyone books.",
      spent: "Spent",
      spentValue: "€1,860",
      of: "of €3,000",
      approval: "Travel approved",
    },
    attribution: "Routing by OpenRouteService. Map data © OpenStreetMap contributors.",
  },
  capture: {
    eyebrow: "For travelers",
    title: "Receipts captured in seconds, not at month-end.",
    sub: "A receipt-first form means the hard part is done the moment you take the photo. Everything you log stays attached to the trip it belongs to.",
    points: [
      "Snap a photo or upload a PDF, then confirm the details",
      "Log every expense against the right trip",
      "Submit with one tap; fix and resubmit anything sent back",
      "Always see what you're owed and what's already paid",
      "Keep passports, visas and itineraries in your document vault",
    ],
    mobileNote: "iOS and Android apps are coming soon. Until then, the web app works in any phone browser.",
    mock: {
      title: "New expense",
      receipt: "Receipt",
      receiptHint: "Photo or PDF",
      amount: "Amount",
      amountValue: "€32.40",
      merchant: "Merchant",
      merchantValue: "Taxi Lisboa",
      category: "Category",
      categoryValue: "Transport",
      trip: "Trip",
      tripValue: "Lisbon client visit",
      submit: "Submit",
      owed: "You're owed",
      owedValue: "€412.60",
      owedMeta: "3 expenses approved, waiting for payment",
      sentBack: "Sent back",
      sentBackMeta: "Dinner · add the itemised receipt",
      resubmit: "Fix",
      vault: "Document vault",
      docs: ["Passport", "Schengen visa", "Itinerary.pdf"],
    },
  },
  review: {
    eyebrow: "For finance",
    title: "One queue to review, approve and pay.",
    sub: "Everything waiting on a decision lands in a single Review & pay queue, with the context you need to decide quickly and the flags you need to decide carefully.",
    points: [
      "Bulk approve, send back with a reason, or mark as paid",
      "Possible duplicates and missing receipts are flagged",
      "Trips carry budgets and travel approvals",
      "Export to CSV for payroll and accounting",
    ],
    mock: {
      title: "Review & pay",
      tabs: ["To review", "Approved", "To pay"],
      counts: ["12", "5", "8"],
      selected: "3 selected",
      approve: "Approve",
      sendBack: "Send back",
      markPaid: "Mark paid",
      export: "Export CSV",
      duplicate: "Possible duplicate",
      missing: "Missing receipt",
      rows: [
        { name: "Ana Ruiz", what: "Hotel Baixa · Lisbon", amount: "€384.00" },
        { name: "Tom Becker", what: "Taxi · Lisbon", amount: "€32.40" },
        { name: "Tom Becker", what: "Taxi · Lisbon", amount: "€32.40" },
        { name: "Mia Chen", what: "Team dinner · Lisbon", amount: "€146.80" },
      ],
    },
  },
  analytics: {
    eyebrow: "Analytics",
    title: "See where the money goes, and how fast it comes back.",
    sub: "Spend is reported per currency so totals are never quietly mixed, and two timing metrics show where your process slows down.",
    points: [
      "Spend per currency and per trip",
      "Time to decision: how long expenses wait for review",
      "Time to reimburse: how long people wait to be paid",
    ],
    mock: {
      title: "Spend by month",
      currencies: ["EUR", "USD", "GBP"],
      months: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
      values: ["€8.2k", "€11.4k", "€6.1k", "€13.9k", "€12.2k", "€9.7k"],
      decision: "Time to decision",
      decisionValue: "1.6 days",
      reimburse: "Time to reimburse",
      reimburseValue: "4.2 days",
      chartLabel: "Bar chart of monthly spend in euros, June to November.",
    },
  },
  security: {
    eyebrow: "Security and ownership",
    title: "Your data stays on your servers.",
    sub: "Expenn runs entirely on infrastructure you control. No third-party cloud holds your receipts, your people or your spend.",
    items: [
      { t: "Self-hosted end to end", d: "Expense data lives in your PostgreSQL database and receipts in your S3-compatible storage." },
      { t: "Passwordless sign-in", d: "People sign in with one-time email codes. No passwords to leak, reuse or reset." },
      { t: "Single sign-on", d: "Connect your identity provider over OIDC, LDAP or Active Directory, or Microsoft Entra ID." },
      { t: "Open source, MIT", d: "Read every line, audit it and fork it. The full source is on GitHub." },
      { t: "Document vault", d: "Passports, visas and itineraries are stored next to the trips they belong to." },
      { t: "No lock-in", d: "CSV exports and direct access to your own database mean you can always take your data with you." },
    ],
  },
  selfHost: {
    eyebrow: "Free and open source",
    title: "Up and running with one command.",
    sub: "Expenn is MIT licensed and has no paid plans. Clone the repository, add your secrets and start the stack: PostgreSQL, MinIO, RabbitMQ, the API and the web app come up together.",
    steps: [
      { t: "Clone the repository", d: "Everything lives in one repo on GitHub." },
      { t: "Add your secrets", d: "Copy .env.example and fill in the values marked FILL ME." },
      { t: "Start the stack", d: "Run docker compose up and open localhost:3001." },
    ],
    github: "View on GitHub",
    docs: "Read the docs",
    terminal: "Terminal",
    copy: "Copy commands",
    copied: "Copied",
    comment: "# fill in the secrets marked FILL ME",
    ready: "Web app ready on http://localhost:3001",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions, answered.",
    sub: "Can't find what you're looking for? The help center covers setup and everyday use.",
    docs: "Visit the help center",
    issue: "Open an issue on GitHub",
    items: [
      {
        q: "Is Expenn really free?",
        a: "Yes. Expenn is open-source software released under the MIT license. There are no paid plans and no per-seat fees; you only pay for the servers you run it on.",
      },
      {
        q: "Is there a hosted version?",
        a: "Expenn is self-hosted. The public live demo is there to explore the product; for your team's real data, run your own instance.",
      },
      {
        q: "What do I need to run it?",
        a: "A machine with Docker and Docker Compose. The stack includes PostgreSQL, MinIO for S3-compatible storage, RabbitMQ, the .NET API and the web app. In production you can point it at your own database and storage.",
      },
      {
        q: "How does trip routing work?",
        a: "Route planning and place search use OpenRouteService, and maps are drawn from OpenStreetMap data. Add an OpenRouteService API key to turn routing on; without one, everything else keeps working.",
      },
      {
        q: "How do people sign in?",
        a: "With one-time codes sent by email, so there are no passwords to manage. You can also connect single sign-on through OIDC, LDAP or Active Directory, and Microsoft Entra ID.",
      },
      {
        q: "Is there a mobile app?",
        a: "Native iOS and Android apps are coming soon but are not in the app stores yet. In the meantime, the web app works in any mobile browser.",
      },
      {
        q: "Can we get our data out?",
        a: "Always. Export expenses to CSV for payroll or accounting, and because Expenn runs on your own PostgreSQL and storage, the data is yours to query and back up.",
      },
    ],
  },
  final: {
    title: "Ready to retire the expense spreadsheet?",
    sub: "Try the live demo in your browser, or run your own instance in minutes. Either way, it's free.",
    ctaPrimary: "Get started",
    ctaDemo: "Try the live demo",
  },
  footer: {
    tag: "Open-source expense and travel management for teams. Self-hosted, free, and yours.",
    product: "Product",
    resources: "Resources",
    legal: "Legal",
    features: "Features",
    howItWorks: "How it works",
    docs: "Help center",
    github: "GitHub",
    demo: "Live demo",
    privacy: "Privacy",
    terms: "Terms",
    copy: "© 2026 Expenn. Released under the MIT License.",
    credits: "Map data © OpenStreetMap contributors. Routing by OpenRouteService.",
  },
  notFound: {
    tag: "404",
    title: "We can't find that page.",
    sub: "The link may be broken, or the page might have been moved. Let's get you back on the road.",
  },
  errorPage: {
    title: "Something went sideways.",
    sub: "We hit an unexpected snag. Try reloading — most of the time that's all it takes.",
  },
  privacy: {
    title: "Privacy Policy",
    sub: "What we collect, why we collect it and the choices you have.",
    date: "May 9, 2026",
    sections: [
      {
        h: "1. Who we are",
        p: 'Expenn ("we", "us") provides a workspace for travelers to capture receipts, organize trips, and manage expenses. You can reach us anytime at hi@expenn.com.',
      },
      {
        h: "2. What we collect",
        p: "Account information (name, email), receipts and documents you upload, and usage data needed to keep the product reliable. We do not sell your data.",
      },
      {
        h: "3. How we use your data",
        p: "To provide and improve the service, process expenses you submit, and communicate important account updates. Receipts are processed to extract amounts, dates and merchants.",
      },
      {
        h: "4. Storage and security",
        p: "Your data is encrypted in transit and at rest. Access is limited to the minimum personnel required to operate the service.",
      },
      {
        h: "5. Your rights",
        p: "You can export, correct or delete your data at any time. Email hi@expenn.com and we'll respond within 30 days.",
      },
      {
        h: "6. Changes",
        p: "If we materially change this policy we'll notify you by email and update the date above.",
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    sub: "The ground rules for using Expenn.",
    date: "May 9, 2026",
    sections: [
      { h: "1. Acceptance", p: "By creating an Expenn account or using the service you agree to these terms. If you don't agree, please don't use Expenn." },
      { h: "2. Your account", p: "You're responsible for the activity in your account and for keeping your credentials safe. Notify us at hi@expenn.com if you suspect unauthorized access." },
      { h: "3. Acceptable use", p: "Don't upload illegal content, attempt to break our security, or use Expenn to harm others. We may suspend accounts that violate these rules." },
      { h: "4. Your content", p: "You own everything you upload. You grant us only the permissions needed to operate the service on your behalf (storage, processing, backup)." },
      { h: "5. Liability", p: 'Expenn is provided "as is". To the extent allowed by law our liability is limited to the amount you paid for the service in the previous 12 months.' },
      { h: "6. Contact", p: "Questions about these terms? Email hi@expenn.com." },
    ],
  },
};

export type Dict = typeof en;

const es: Dict = {
  nav: {
    product: "Producto",
    trips: "Viajes",
    security: "Seguridad",
    selfHost: "Autoalojado",
    faq: "Preguntas",
    docs: "Ayuda",
    signIn: "Iniciar sesión",
    getStarted: "Empezar",
    openDashboard: "Abrir panel",
    menu: "Abrir menú",
    close: "Cerrar menú",
    language: "Idioma",
    primary: "Principal",
  },
  common: {
    backHome: "Volver al inicio",
    goHome: "Ir al inicio",
    tryAgain: "Reintentar",
    lastUpdated: "Última actualización",
    onThisPage: "En esta página",
    questions: "¿Dudas?",
    questionsBody: "Escríbenos y te responderemos.",
  },
  hero: {
    badgeNew: "Nuevo",
    badge: "Planificación de viajes con mapas y rutas",
    title1: "Viajes de empresa,",
    title2: "de la ruta al reembolso.",
    sub: "Expenn es software libre y gratuito para gestionar los gastos y viajes de tu equipo. Planifica viajes con varias paradas en un mapa, captura recibos en segundos y aprueba y paga desde una sola bandeja, todo en tus propios servidores.",
    ctaPrimary: "Empezar",
    ctaDemo: "Ver la demo",
    ctaGithub: "Danos una estrella",
    points: ["Gratis y con licencia MIT", "Autoalojado con Docker", "Listo para SSO"],
  },
  mock: {
    url: "expenn.example.com/trips/lisboa",
    trip: "Visita a cliente en Lisboa",
    dates: "12–15 mar",
    budget: "Presupuesto",
    budgetValue: "1860 € de 3000 €",
    driving: "Coche",
    cycling: "Bici",
    walking: "A pie",
    stops: ["Aeropuerto de Lisboa (LIS)", "Oficina del cliente, Parque das Nações", "Hotel en la Baixa", "Cena de equipo en Belém"],
    legs: ["7,4 km · 16 min", "8,9 km · 19 min", "6,2 km · 14 min"],
    optimise: "Optimizar orden",
    search: "Buscar lugares",
    total: "3 tramos · 22,5 km · 49 min",
    expenseTitle: "Taxi desde el aeropuerto",
    expenseAmount: "32,40 €",
    expenseMeta: "Recibo adjunto",
    ready: "Listo",
    approved: "Aprobado",
    approvedMeta: "Hotel, 3 noches · 384,00 €",
    attribution: "© OpenStreetMap",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    label: "Ilustración del planificador de viajes de Expenn: un mapa con una ruta de cuatro paradas por Lisboa y el itinerario al lado.",
  },
  builtOn: {
    label: "Construido sobre bases abiertas",
    items: ["OpenStreetMap", "OpenRouteService", "PostgreSQL", "Almacenamiento compatible con S3", "OpenID Connect", "Docker Compose"],
  },
  how: {
    eyebrow: "Cómo funciona",
    title: "Cuatro pasos del recibo al reembolso.",
    sub: "Quien viaja captura, finanzas decide y todos saben en qué punto está cada gasto. Sin hojas de cálculo ni persecuciones.",
    steps: [
      { t: "Captura", d: "Haz una foto o sube un PDF. Primero el recibo; el formulario viene después." },
      { t: "Envía", d: "Asígnalo al viaje y mándalo a aprobar con un solo toque." },
      { t: "Aprueba", d: "Finanzas lo revisa todo en una sola bandeja, o lo devuelve con un motivo." },
      { t: "Reembolsa", d: "Márcalo como pagado. Cada viajero sabe siempre cuánto se le debe." },
    ],
  },
  trips: {
    eyebrow: "Planificación de viajes",
    title1: "Cada parada, en el mapa.",
    title2: "Cada trayecto, claro antes de salir.",
    sub: "Crea viajes con varias paradas en un mapa interactivo, compara rutas para cada forma de desplazarte y deja que Expenn encuentre un orden mejor. Cada tramo muestra su distancia y duración, y el itinerario reúne fechas y notas.",
    routes: {
      title: "Compara rutas",
      d: "En coche, en bici o a pie, con alternativas una al lado de otra.",
      fastest: "Más rápida",
      alternatives: "+2 alternativas",
      options: [
        { mode: "En coche", value: "22,5 km · 49 min" },
        { mode: "En bici", value: "20,1 km · 1 h 18 min" },
        { mode: "A pie", value: "18,7 km · 3 h 52 min" },
      ],
    },
    optimise: {
      title: "Optimiza el orden",
      d: "Con un clic, tus paradas se reordenan para el trayecto más corto.",
      before: "Tu orden",
      beforeValue: "28,8 km",
      after: "Optimizado",
      afterValue: "22,5 km",
      saved: "−6,3 km",
    },
    itinerary: {
      title: "Itinerario por días",
      d: "Fechas, horas y notas para cada parada.",
      days: [
        { day: "Lun 12", time: "09:40", place: "Llegada a LIS", note: "Taxi a la oficina del cliente" },
        { day: "Lun 12", time: "11:00", place: "Oficina del cliente", note: "Acreditación en recepción" },
        { day: "Mar 13", time: "20:00", place: "Cena de equipo en Belém", note: "Mesa para 6" },
      ],
    },
    search: {
      title: "Busca lugares",
      d: "Encuentra direcciones y locales y añádelos como paradas.",
      query: "Parque das",
      results: ["Parque das Nações, Lisboa", "Estación Parque das Nações", "Parque Eduardo VII"],
      add: "Añadir parada",
    },
    budget: {
      title: "Presupuestos y aprobaciones",
      d: "Dale un presupuesto a cada viaje y apruébalo antes de que nadie reserve.",
      spent: "Gastado",
      spentValue: "1860 €",
      of: "de 3000 €",
      approval: "Viaje aprobado",
    },
    attribution: "Rutas de OpenRouteService. Datos del mapa © colaboradores de OpenStreetMap.",
  },
  capture: {
    eyebrow: "Para quien viaja",
    title: "Recibos capturados en segundos, no a fin de mes.",
    sub: "Con un formulario que empieza por el recibo, lo difícil está hecho en cuanto haces la foto. Todo lo que registras queda unido al viaje que le corresponde.",
    points: [
      "Haz una foto o sube un PDF y confirma los datos",
      "Registra cada gasto en el viaje correcto",
      "Envía con un toque; corrige y reenvía lo que te devuelvan",
      "Consulta siempre cuánto se te debe y qué ya está pagado",
      "Guarda pasaportes, visados e itinerarios en tu archivo de documentos",
    ],
    mobileNote: "Las apps para iOS y Android llegarán pronto. Mientras tanto, la app web funciona en el navegador de cualquier móvil.",
    mock: {
      title: "Nuevo gasto",
      receipt: "Recibo",
      receiptHint: "Foto o PDF",
      amount: "Importe",
      amountValue: "32,40 €",
      merchant: "Comercio",
      merchantValue: "Taxi Lisboa",
      category: "Categoría",
      categoryValue: "Transporte",
      trip: "Viaje",
      tripValue: "Visita a cliente en Lisboa",
      submit: "Enviar",
      owed: "Se te debe",
      owedValue: "412,60 €",
      owedMeta: "3 gastos aprobados, pendientes de pago",
      sentBack: "Devuelto",
      sentBackMeta: "Cena · añade el recibo detallado",
      resubmit: "Corregir",
      vault: "Archivo de documentos",
      docs: ["Pasaporte", "Visado Schengen", "Itinerario.pdf"],
    },
  },
  review: {
    eyebrow: "Para finanzas",
    title: "Una sola bandeja para revisar, aprobar y pagar.",
    sub: "Todo lo que espera una decisión llega a una única bandeja de Revisión y pago, con el contexto para decidir rápido y los avisos para decidir con cuidado.",
    points: [
      "Aprueba en bloque, devuelve con un motivo o marca como pagado",
      "Avisos de posibles duplicados y recibos que faltan",
      "Los viajes incluyen presupuesto y aprobación previa",
      "Exporta a CSV para nóminas y contabilidad",
    ],
    mock: {
      title: "Revisión y pago",
      tabs: ["Por revisar", "Aprobados", "Por pagar"],
      counts: ["12", "5", "8"],
      selected: "3 seleccionados",
      approve: "Aprobar",
      sendBack: "Devolver",
      markPaid: "Marcar pagado",
      export: "Exportar CSV",
      duplicate: "Posible duplicado",
      missing: "Falta el recibo",
      rows: [
        { name: "Ana Ruiz", what: "Hotel Baixa · Lisboa", amount: "384,00 €" },
        { name: "Tom Becker", what: "Taxi · Lisboa", amount: "32,40 €" },
        { name: "Tom Becker", what: "Taxi · Lisboa", amount: "32,40 €" },
        { name: "Mia Chen", what: "Cena de equipo · Lisboa", amount: "146,80 €" },
      ],
    },
  },
  analytics: {
    eyebrow: "Analítica",
    title: "Mira adónde va el dinero y lo rápido que vuelve.",
    sub: "El gasto se muestra por moneda para que los totales nunca se mezclen, y dos métricas de tiempo te dicen dónde se atasca el proceso.",
    points: [
      "Gasto por moneda y por viaje",
      "Tiempo hasta la decisión: cuánto esperan los gastos a ser revisados",
      "Tiempo hasta el reembolso: cuánto espera la gente a cobrar",
    ],
    mock: {
      title: "Gasto mensual",
      currencies: ["EUR", "USD", "GBP"],
      months: ["jun", "jul", "ago", "sep", "oct", "nov"],
      values: ["8,2 k€", "11,4 k€", "6,1 k€", "13,9 k€", "12,2 k€", "9,7 k€"],
      decision: "Hasta la decisión",
      decisionValue: "1,6 días",
      reimburse: "Hasta el reembolso",
      reimburseValue: "4,2 días",
      chartLabel: "Gráfico de barras del gasto mensual en euros, de junio a noviembre.",
    },
  },
  security: {
    eyebrow: "Seguridad y control",
    title: "Tus datos se quedan en tus servidores.",
    sub: "Expenn funciona por completo en infraestructura que tú controlas. Ninguna nube ajena guarda tus recibos, tu equipo ni tu gasto.",
    items: [
      { t: "Autoalojado de principio a fin", d: "Los gastos viven en tu base de datos PostgreSQL y los recibos en tu almacenamiento compatible con S3." },
      { t: "Acceso sin contraseña", d: "Se entra con códigos de un solo uso enviados por email. Nada de contraseñas que filtrar, repetir o restablecer." },
      { t: "Inicio de sesión único", d: "Conecta tu proveedor de identidad por OIDC, LDAP o Active Directory, o Microsoft Entra ID." },
      { t: "Código abierto, MIT", d: "Lee cada línea, audítalo y haz tu propio fork. Todo el código está en GitHub." },
      { t: "Archivo de documentos", d: "Pasaportes, visados e itinerarios guardados junto al viaje al que pertenecen." },
      { t: "Sin ataduras", d: "Con las exportaciones CSV y acceso directo a tu base de datos, tus datos siempre se van contigo." },
    ],
  },
  selfHost: {
    eyebrow: "Libre y gratuito",
    title: "En marcha con un solo comando.",
    sub: "Expenn tiene licencia MIT y no tiene planes de pago. Clona el repositorio, añade tus secretos y arranca: PostgreSQL, MinIO, RabbitMQ, la API y la app web se levantan juntos.",
    steps: [
      { t: "Clona el repositorio", d: "Todo está en un único repositorio de GitHub." },
      { t: "Añade tus secretos", d: "Copia .env.example y rellena los valores marcados FILL ME." },
      { t: "Arranca el stack", d: "Ejecuta docker compose up y abre localhost:3001." },
    ],
    github: "Ver en GitHub",
    docs: "Leer la documentación",
    terminal: "Terminal",
    copy: "Copiar comandos",
    copied: "Copiado",
    comment: "# rellena los secretos marcados FILL ME",
    ready: "App web lista en http://localhost:3001",
  },
  faq: {
    eyebrow: "Preguntas frecuentes",
    title: "Preguntas con respuesta.",
    sub: "¿No encuentras lo que buscas? El centro de ayuda explica la instalación y el uso diario.",
    docs: "Ir al centro de ayuda",
    issue: "Abrir una incidencia en GitHub",
    items: [
      {
        q: "¿Expenn es gratis de verdad?",
        a: "Sí. Expenn es software libre publicado con licencia MIT. No hay planes de pago ni cuotas por usuario; solo pagas los servidores donde lo instales.",
      },
      {
        q: "¿Hay una versión alojada?",
        a: "Expenn se instala en tus servidores. La demo pública sirve para explorar el producto; para los datos reales de tu equipo, usa tu propia instancia.",
      },
      {
        q: "¿Qué necesito para instalarlo?",
        a: "Una máquina con Docker y Docker Compose. El stack incluye PostgreSQL, MinIO como almacenamiento compatible con S3, RabbitMQ, la API en .NET y la app web. En producción puedes usar tu propia base de datos y almacenamiento.",
      },
      {
        q: "¿Cómo funcionan las rutas?",
        a: "La planificación de rutas y la búsqueda de lugares usan OpenRouteService, y los mapas se dibujan con datos de OpenStreetMap. Añade una clave de API de OpenRouteService para activar las rutas; sin ella, todo lo demás sigue funcionando.",
      },
      {
        q: "¿Cómo se inicia sesión?",
        a: "Con códigos de un solo uso enviados por email, así que no hay contraseñas que gestionar. También puedes conectar el inicio de sesión único por OIDC, LDAP o Active Directory, y Microsoft Entra ID.",
      },
      {
        q: "¿Hay app para el móvil?",
        a: "Las apps nativas para iOS y Android llegarán pronto, pero aún no están en las tiendas. Mientras tanto, la app web funciona en cualquier navegador móvil.",
      },
      {
        q: "¿Podemos llevarnos nuestros datos?",
        a: "Siempre. Exporta los gastos a CSV para nóminas o contabilidad y, como Expenn funciona sobre tu propio PostgreSQL y almacenamiento, los datos son tuyos para consultarlos y respaldarlos.",
      },
    ],
  },
  final: {
    title: "¿Listo para jubilar la hoja de gastos?",
    sub: "Prueba la demo en tu navegador o instala tu propia versión en minutos. De cualquier forma, es gratis.",
    ctaPrimary: "Empezar",
    ctaDemo: "Probar la demo",
  },
  footer: {
    tag: "Gestión de gastos y viajes de código abierto para equipos. Autoalojada, gratuita y tuya.",
    product: "Producto",
    resources: "Recursos",
    legal: "Legal",
    features: "Funciones",
    howItWorks: "Cómo funciona",
    docs: "Centro de ayuda",
    github: "GitHub",
    demo: "Demo en vivo",
    privacy: "Privacidad",
    terms: "Términos",
    copy: "© 2026 Expenn. Publicado con licencia MIT.",
    credits: "Datos del mapa © colaboradores de OpenStreetMap. Rutas de OpenRouteService.",
  },
  notFound: {
    tag: "404",
    title: "No encontramos esa página.",
    sub: "El enlace puede estar roto o la página se movió. Te llevamos de vuelta al camino.",
  },
  errorPage: {
    title: "Algo salió de ruta.",
    sub: "Hubo un fallo inesperado. Prueba a recargar — casi siempre es suficiente.",
  },
  privacy: {
    title: "Política de Privacidad",
    sub: "Qué datos recogemos, para qué y qué opciones tienes.",
    date: "9 de mayo de 2026",
    sections: [
      { h: "1. Quiénes somos", p: 'Expenn ("nosotros") ofrece un espacio para que los viajeros capturen recibos, organicen viajes y gestionen gastos. Escríbenos cuando quieras a hi@expenn.com.' },
      { h: "2. Qué recopilamos", p: "Datos de cuenta (nombre, email), recibos y documentos que subes, y datos de uso para mantener el producto fiable. No vendemos tus datos." },
      { h: "3. Cómo usamos tus datos", p: "Para prestar y mejorar el servicio, procesar gastos y comunicarte avisos importantes. Los recibos se procesan para extraer importes, fechas y comercios." },
      { h: "4. Almacenamiento y seguridad", p: "Tus datos están cifrados en tránsito y en reposo. El acceso se limita al personal mínimo necesario para operar el servicio." },
      { h: "5. Tus derechos", p: "Puedes exportar, corregir o eliminar tus datos cuando quieras. Escribe a hi@expenn.com y respondemos en 30 días." },
      { h: "6. Cambios", p: "Si cambiamos esta política sustancialmente te avisaremos por email y actualizaremos la fecha de arriba." },
    ],
  },
  terms: {
    title: "Términos de Uso",
    sub: "Las reglas básicas para usar Expenn.",
    date: "9 de mayo de 2026",
    sections: [
      { h: "1. Aceptación", p: "Al crear una cuenta de Expenn o usar el servicio aceptas estos términos. Si no estás de acuerdo, por favor no uses Expenn." },
      { h: "2. Tu cuenta", p: "Eres responsable de la actividad en tu cuenta y de mantener tus credenciales seguras. Avísanos a hi@expenn.com si sospechas de un acceso no autorizado." },
      { h: "3. Uso aceptable", p: "No subas contenido ilegal, no intentes vulnerar nuestra seguridad ni uses Expenn para perjudicar a otros. Podemos suspender cuentas que infrinjan estas reglas." },
      { h: "4. Tu contenido", p: "Eres dueño de todo lo que subes. Nos das solo los permisos necesarios para operar el servicio en tu nombre (almacenamiento, procesamiento, copias)." },
      { h: "5. Responsabilidad", p: 'Expenn se ofrece "tal cual". En la medida que la ley lo permita, nuestra responsabilidad se limita al importe pagado por el servicio en los 12 meses previos.' },
      { h: "6. Contacto", p: "¿Dudas sobre los términos? Escribe a hi@expenn.com." },
    ],
  },
};

const dict: Record<Lang, Dict> = { en, es };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("lang");
    } catch {
      stored = null;
    }
    if (stored === "en" || stored === "es") {
      const next: Lang = stored;
      queueMicrotask(() => setLangState(next));
    }
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* storage unavailable: keep the in-memory choice */
    }
  };
  return <I18nCtx.Provider value={{ lang, setLang, t: dict[lang] }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
