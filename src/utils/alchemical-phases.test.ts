import { describe, it, expect } from "vitest";
import {
  countPatternMatches,
  getEmergedSymbols,
  type EmergedSymbolDebug,
} from "./alchemical-phases";

const today = new Date().toISOString();

const dream = (id: string, content: string, tags: string[] = []) => ({
  id,
  dream_date: today,
  content,
  tags,
  interpretation: "",
  mood: "",
});

describe("countPatternMatches", () => {
  it("conta occorrenze con word-boundary su parole semplici", () => {
    expect(countPatternMatches("Vedo un corvo nero, poi un altro corvo.", "corvo")).toBe(2);
  });

  it("non matcha sotto-stringhe interne", () => {
    // 'oro' non deve matchare dentro 'lavoro'
    expect(countPatternMatches("Il mio lavoro era difficile.", "oro")).toBe(0);
  });

  it("rispetta accenti italiani come delimitatori validi", () => {
    expect(countPatternMatches("perché c'era il sole", "sole")).toBe(1);
  });

  it("gestisce apostrofi: la parola dopo l'apostrofo è una parola separata", () => {
    expect(countPatternMatches("vidi l'unicorno bianco", "unicorno")).toBe(1);
  });

  it("è case-insensitive", () => {
    expect(countPatternMatches("CORVO corvo Corvo", "corvo")).toBe(3);
  });
});

describe("getEmergedSymbols - dizionario sinonimi", () => {
  it("aggrega sinonimi sotto lo stesso simbolo canonico", () => {
    const dreams = [
      dream("1", "vidi un corvo", []),
      dream("2", "una cornacchia volava", []),
      dream("3", "uccelli neri ovunque", []),
    ];
    const symbols = getEmergedSymbols(dreams);
    const corvo = symbols.find((s) => s.symbol === "corvo");
    expect(corvo).toBeDefined();
    expect(corvo!.occurrences).toBeGreaterThanOrEqual(3);
  });

  it("riconosce varianti morfologiche generate (plurali, gerundi)", () => {
    // 'volare' è nel dizionario (rubedo) → deve generare 'volando', 'volato'
    const dreams = [dream("1", "stavo volando libero nel cielo")];
    const symbols = getEmergedSymbols(dreams);
    const volo = symbols.find((s) => s.symbol === "volo");
    expect(volo).toBeDefined();
  });

  it("evita doppi conteggi quando pattern si sovrappongono", () => {
    // 'sole splendente' contiene 'sole' (entrambi nel canonico 'sole splendente')
    // Il merge degli intervalli deve contare 1, non 2.
    const dreams = [dream("1", "il sole splendente illuminava tutto")];
    const result = getEmergedSymbols(dreams, { debug: true }) as EmergedSymbolDebug[];
    const sole = result.find((s) => s.symbol === "sole splendente");
    expect(sole).toBeDefined();
    expect(sole!.occurrences).toBe(1);
  });

  it("debug mode espone sinonimi matchati e occorrenze per sogno", () => {
    const dreams = [
      dream("d1", "un corvo nero sul ramo"),
      dream("d2", "una cornacchia gracchiante"),
    ];
    const result = getEmergedSymbols(dreams, { debug: true }) as EmergedSymbolDebug[];
    const corvo = result.find((s) => s.symbol === "corvo")!;
    expect(corvo.matchedSynonyms.length).toBeGreaterThan(0);
    expect(corvo.perDream.length).toBe(2);
    const sources = corvo.perDream.flatMap((p) => p.sources);
    expect(sources).toEqual(expect.arrayContaining(["corvo", "cornacchia"]));
  });

  it("ritorna array vuoto per input vuoto", () => {
    expect(getEmergedSymbols([])).toEqual([]);
  });
});
