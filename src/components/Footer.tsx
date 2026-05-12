import { useState } from "react";
import { Link } from "react-router-dom";
import ComingSoonDialog from "./ComingSoonDialog";

type FooterLink = { label: string; to?: string; comingSoon?: boolean };

const cols: { title: string; links: FooterLink[] }[] = [
  {
    title: "L'opera",
    links: [
      { label: "Il diario", to: "/my-dreams" },
      { label: "Astrologia", to: "/astrology" },
      { label: "Alchimia", to: "/alchemy" },
      { label: "Percorsi Sonori", comingSoon: true },
    ],
  },
  {
    title: "Esplora",
    links: [
      { label: "I sogni della comunità", to: "/explore" },
      { label: "Sogni condivisi", to: "/shared-with-me" },
      { label: "Chi siamo", to: "/about" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Accedi", to: "/auth?mode=login" },
      { label: "Registrati", to: "/auth?mode=signup" },
      { label: "Impostazioni", to: "/settings" },
    ],
  },
];

const Footer = () => {
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  return (
    <footer
      className="relative pt-24 pb-12 border-t border-mystic-violet/15"
      style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
    >
      <div className="container mx-auto px-6 lg:px-10 max-w-6xl">
        {/* Asterismo iniziale */}
        <div className="ed-asterism mb-20">
          <span className="ed-line" />
          <span>※</span>
          <span className="ed-line" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 md:gap-16 mb-20">
          {/* Brand */}
          <div>
            <div
              className="font-editorial uppercase tracking-[0.18em] text-foreground mb-5"
              style={{ fontSize: "20px" }}
            >
              Dream Alchemist
            </div>
            <p className="font-editorial italic text-base leading-relaxed text-foreground/65 max-w-[32ch]">
              Un santuario silenzioso per la vita onirica. Dal cielo natale al
              sogno — dal simbolo alla coscienza.
            </p>
            <div className="ed-meta mt-6">MMXXVI · Edizione italiana</div>
          </div>

          {/* Colonne */}
          {cols.map((col) => (
            <div key={col.title}>
              <h5
                className="text-[11px] uppercase tracking-[0.28em] mb-6 font-medium"
                style={{ color: "hsl(var(--mystic-glow))" }}
              >
                {col.title}
              </h5>
              <ul className="flex flex-col gap-4">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.comingSoon ? (
                      <button
                        type="button"
                        onClick={() => setComingSoonOpen(true)}
                        className="font-editorial italic text-base text-foreground/65 hover:text-mystic-pink transition-colors text-left"
                      >
                        {l.label} <span className="text-foreground/35">…</span>
                      </button>
                    ) : (
                      <Link
                        to={l.to!}
                        className="font-editorial italic text-base text-foreground/65 hover:text-mystic-pink transition-colors"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="ed-divider mb-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ed-meta">
          <span>© MMXXVI · Dream Alchemist · Jessica Marin</span>
          <div className="flex flex-wrap gap-8">
            <a href="#" className="hover:text-mystic-pink transition-colors">Privacy</a>
            <a href="#" className="hover:text-mystic-pink transition-colors">Termini</a>
            <a href="mailto:noreply@dreamalchemist.app" className="hover:text-mystic-pink transition-colors">Contatti</a>
          </div>
        </div>
      </div>
      <ComingSoonDialog open={comingSoonOpen} onOpenChange={setComingSoonOpen} />
    </footer>
  );
};

export default Footer;
