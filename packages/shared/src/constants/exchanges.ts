export const EXCHANGES = {
  TASE: 'TASE',
  NASDAQ: 'NASDAQ',
  NYSE: 'NYSE',
  AMEX: 'AMEX',
} as const;

export const TASE_MARKET_HOURS = {
  timezone: 'Asia/Jerusalem',
  open: '10:00',
  close: '17:30',
  // TASE trades Sun-Thu
  tradingDays: [0, 1, 2, 3, 4], // 0=Sunday in Israel
};

export const US_MARKET_HOURS = {
  timezone: 'America/New_York',
  open: '09:30',
  close: '16:00',
  tradingDays: [1, 2, 3, 4, 5], // Mon-Fri
};

// TA-35 index components (top 35 TASE stocks)
export const TA35_TICKERS = [
  'TEVA.TA', 'NICE.TA', 'CHKP.TA', 'ESLT.TA', 'LUMI.TA',
  'MZTF.TA', 'POLI.TA', 'BEZQ.TA', 'ICL.TA', 'AMOT.TA',
  'ELCO.TA', 'IGLD.TA', 'MGDL.TA', 'NVMI.TA', 'ONE.TA',
  'ORL.TA', 'RBSN.TA', 'SPEN.TA', 'TASE.TA', 'WLMT.TA',
  'ALBT.TA', 'AURA.TA', 'BWAY.TA', 'CAMT.TA', 'DLEKG.TA',
  'ENLT.TA', 'FIBI.TA', 'FORTY.TA', 'GPRE.TA', 'HARL.TA',
  'ICCM.TA', 'ISCD.TA', 'KARE.TA', 'LAHAV.TA', 'MAPI.TA',
];

// Popular US stocks among Israeli traders
export const POPULAR_US_TICKERS = [
  'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META',
  'AMD', 'INTC', 'TEVA', 'NICE', 'CHKP', 'CYBR', 'WIX',
  'MNDY', 'GLBE', 'FVRR', 'LMND', 'GILI',
];
