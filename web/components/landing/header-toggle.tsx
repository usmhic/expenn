import { Moon, Sun, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "next-themes";

export function HeaderToggles() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setLang(lang === "en" ? "es" : "en")}
        className="h-9 px-2.5 rounded-full glass text-xs font-semibold text-foreground hover:bg-accent transition flex items-center gap-1.5"
        aria-label="Toggle language"
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wider">{lang}</span>
      </button>
      <button
        onClick={setTheme.bind(null, theme === "dark" ? "light" : "dark")}
        className="h-9 w-9 rounded-full glass grid place-items-center text-foreground hover:bg-accent transition"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}
