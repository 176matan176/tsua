/**
 * Ticker → origin (Israeli vs US/world) classification.
 *
 * Used by the feed market filter and the cashtag flag hints. "Israeli" here
 * means the COMPANY is Israeli — matching the product's existing mental model
 * (the hot-stocks widget puts US-listed TEVA/NICE under the "ת"א" tab) — NOT
 * which exchange floor the symbol trades on. For trading-hours logic use
 * marketForSymbol() in lib/marketHours.ts instead, which correctly maps
 * US-listed Israeli names to the US session.
 *
 * Cashtags are bare Latin symbols ($POLI, $NVDA — the regex accepts no ".TA"),
 * so TASE names are matched by their bare form as well.
 */
import { IL_UNIVERSE } from '@/lib/hotStocks';

// TASE-listed names users cashtag by bare symbol. Curated from the TASE
// entries in stockDescriptions.ts (banks, insurance, real-estate, telecom —
// names with no US listing users would mean instead).
const TASE_BARE = [
  'POLI', 'LUMI', 'DSCT', 'MZTF', 'FIBI',          // banks
  'PHOE', 'MGDL', 'HARL', 'CLIS',                   // insurance
  'AZRG', 'MLSR', 'AMOT', 'BIG',                    // real estate
  'BEZQ', 'PTNR', 'CEL',                            // telecom
  'ELAL', 'SAE', 'DELKG', 'OPCE', 'ENLT', 'NVMI',   // industry/energy
  'TA35', 'TA90', 'TA125',                          // indices
];

const ISRAELI: Set<string> = new Set([
  ...IL_UNIVERSE.map((s) => s.ticker.toUpperCase()),
  ...TASE_BARE,
]);

/** True when the (bare or .TA-suffixed) ticker refers to an Israeli name. */
export function isIsraeliTicker(ticker: string): boolean {
  const t = ticker.toUpperCase().replace(/^\$/, '');
  if (t.endsWith('.TA')) return true;
  return ISRAELI.has(t);
}
