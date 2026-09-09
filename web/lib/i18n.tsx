import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

type Dict = Record<string, any>;

const dict: Record<Lang, Dict> = {
  en: {
    nav: { how: "How it works", features: "Features", contact: "Contact", start: "Start free" },
    common: {
      backHome: "Back home",
      goHome: "Go home",
      tryAgain: "Try again",
      lastUpdated: "Last updated",
    },
    hero: {
      tabTraveler: "Traveler",
      tabAdmin: "Admin",
      trust: "Free personal workspace. Add teammates when you need them.",
      traveler: {
        badge: "For people on the move",
        title1: "Receipts in your pocket,",
        title2: "expenses already done.",
        sub: "Snap, file and submit every receipt in seconds. Expenn takes care of the trip log so you can focus on the trip.",
        cta1: "Start free",
        cta2: "Book a demo",
        caption: "Snap a receipt — Expenn files it.",
      },
      admin: {
        badge: "For finance & operations",
        title1: "Travel spending,",
        title2: "finally under control.",
        sub: "See every trip, every receipt and every approval in one live dashboard. Bulk approve, track budgets, export to your ERP.",
        cta1: "Get started",
        cta2: "Learn more",
        caption: "Approve, track and export — at a glance.",
      },
    },
    workflow: {
      kicker: "How it works",
      title1: "One flow,",
      title2: "two perspectives.",
      sub: "Travelers capture. Admins approve. Expenn carries the receipt across — no spreadsheets, no chasing, no friction.",
      laneTraveler: "Traveler",
      laneAdmin: "Admin",
      handoff: "Handoff",
      handoffDesc: "Submitted expenses arrive structured and ready for review.",
      tabTraveler: "Traveler view",
      tabAdmin: "Admin view",
      traveler: [
        { t: "Snap", d: "Photograph the receipt — that's it." },
        { t: "Organize", d: "We file it under the right trip automatically." },
        { t: "Submit", d: "One tap to send for approval." },
        { t: "Reimburse", d: "Money back, status visible end-to-end." },
      ],
      admin: [
        { t: "Receive", d: "Expenses arrive structured and complete." },
        { t: "Review", d: "Per-trip context, no spreadsheet hunts." },
        { t: "Approve", d: "Bulk approve or comment in one click." },
        { t: "Export", d: "CSV to your ERP. Done." },
      ],
    },
    problem: {
      title1: "Business travel is still",
      title2: "messy.",
      sub: "Expenn fixes the entire workflow so nobody has to think about expenses again.",
      pains: [
        "Receipts get lost.",
        "Expenses pile up.",
        "Finance teams chase people for missing documents.",
        "Travelers waste hours filling spreadsheets.",
      ],
    },
    features: {
      title1: "Everything your team needs to manage",
      title2: "travel spending.",
      items: [
        ["Receipt Capture", "Snap a photo and let Expenn organize the rest."],
        ["Trip Workspaces", "Keep expenses, documents, and travel details grouped by trip."],
        ["Expense Tracking", "Track reimbursements, approvals, and budgets in real time."],
        ["Document Vault", "Store receipts, invoices, passports, visas, itineraries, and more."],
        ["Team Collaboration", "Add travelers, review expenses, approve from one dashboard."],
        ["Mobile-First", "Built for travelers, not accountants."],
      ],
    },
    final: {
      title1: "Travel expenses,",
      title2: "finally simplified.",
      sub: "Join teams using Expenn to manage travel spending without spreadsheets.",
      cta1: "Start free",
      cta2: "Get early access",
    },
    footer: {
      tag: "Travel expenses without spreadsheets.",
      product: "Product",
      legal: "Legal",
      privacy: "Privacy",
      terms: "Terms",
      copy: "© 2026 Expenn.",
      made: "Made for people on the move.",
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
  },
  es: {
    nav: { how: "Cómo funciona", features: "Funciones", contact: "Contacto", start: "Empieza gratis" },
    common: {
      backHome: "Volver al inicio",
      goHome: "Ir al inicio",
      tryAgain: "Reintentar",
      lastUpdated: "Última actualización",
    },
    hero: {
      tabTraveler: "Viajero",
      tabAdmin: "Admin",
      trust: "Espacio personal gratis. Añade compañeros cuando lo necesites.",
      traveler: {
        badge: "Para gente en movimiento",
        title1: "Recibos en el bolsillo,",
        title2: "gastos ya hechos.",
        sub: "Captura, archiva y envía cada recibo en segundos. Expenn lleva el diario del viaje para que tú vivas el viaje.",
        cta1: "Empieza gratis",
        cta2: "Reservar demo",
        caption: "Saca el recibo — Expenn lo archiva.",
      },
      admin: {
        badge: "Para finanzas y operaciones",
        title1: "Gasto de viajes,",
        title2: "por fin bajo control.",
        sub: "Cada viaje, cada recibo y cada aprobación en un solo panel en vivo. Aprueba en bloque, controla presupuestos, exporta a tu ERP.",
        cta1: "Empezar",
        cta2: "Saber más",
        caption: "Aprueba, controla y exporta — de un vistazo.",
      },
    },
    workflow: {
      kicker: "Cómo funciona",
      title1: "Un flujo,",
      title2: "dos perspectivas.",
      sub: "El viajero captura. El admin aprueba. Expenn lleva el recibo de un lado al otro — sin Excel, sin perseguir, sin fricción.",
      laneTraveler: "Viajero",
      laneAdmin: "Admin",
      handoff: "Entrega",
      handoffDesc: "Los gastos enviados llegan estructurados y listos para revisar.",
      tabTraveler: "Vista del viajero",
      tabAdmin: "Vista del admin",
      traveler: [
        { t: "Captura", d: "Fotografía el recibo — y listo." },
        { t: "Organiza", d: "Lo archivamos en el viaje correcto automáticamente." },
        { t: "Envía", d: "Un toque para mandarlo a aprobación." },
        { t: "Cobra", d: "Reembolso con estado visible de extremo a extremo." },
      ],
      admin: [
        { t: "Recibe", d: "Los gastos llegan estructurados y completos." },
        { t: "Revisa", d: "Contexto por viaje, sin buscar en Excel." },
        { t: "Aprueba", d: "Aprueba en bloque o comenta en un clic." },
        { t: "Exporta", d: "CSV directo a tu ERP. Hecho." },
      ],
    },
    problem: {
      title1: "Los viajes de empresa siguen siendo",
      title2: "un caos.",
      sub: "Expenn arregla todo el flujo para que nadie tenga que pensar en gastos.",
      pains: [
        "Se pierden recibos.",
        "Los gastos se acumulan.",
        "Finanzas persigue a la gente por documentos.",
        "Los viajeros pierden horas en hojas de cálculo.",
      ],
    },
    features: {
      title1: "Todo lo que tu equipo necesita para gestionar",
      title2: "los gastos de viaje.",
      items: [
        ["Captura de recibos", "Haz una foto y deja que Expenn organice el resto."],
        ["Espacios por viaje", "Gastos, documentos y detalles agrupados por viaje."],
        ["Control de gastos", "Reembolsos, aprobaciones y presupuestos en tiempo real."],
        ["Bóveda de documentos", "Recibos, facturas, pasaportes, visas e itinerarios."],
        ["Colaboración", "Añade viajeros, revisa y aprueba desde un panel."],
        ["Mobile-First", "Pensado para viajeros, no para contables."],
      ],
    },
    final: {
      title1: "Gastos de viaje,",
      title2: "por fin sencillos.",
      sub: "Únete a los equipos que usan Expenn para gestionar viajes sin hojas de cálculo.",
      cta1: "Empieza gratis",
      cta2: "Acceso anticipado",
    },
    footer: {
      tag: "Gastos de viaje sin hojas de cálculo.",
      product: "Producto",
      legal: "Legal",
      privacy: "Privacidad",
      terms: "Términos",
      copy: "© 2026 Expenn.",
      made: "Hecho para gente en movimiento.",
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
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (stored === "en" || stored === "es") {
      queueMicrotask(() => setLangState(stored));
    }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };
  return <I18nCtx.Provider value={{ lang, setLang, t: dict[lang] }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
