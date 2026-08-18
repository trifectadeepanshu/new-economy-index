export const SECTORS = [
  "Platforms",
  "Consumer Brands",
  "Fintech",
  "B2B",
  "SaaS",
  "Healthcare",
  "Deep Tech",
] as const;

export type Sector = (typeof SECTORS)[number];

export type Company = {
  name: string;
  displayName: string;
  ticker: string;
  yfTicker: string;
  sector: Sector;
  listedDate: string;
  ipoPrice: number | null;
  isPortfolio: boolean;
};

const PORTFOLIO_TICKERS = new Set([
  "MEESHO",
  "URBANCO",
  "IXIGO",
  "BLUESTONE",
  "MOBIKWIK",
  "KISSHT",
  "BLACKBUCK",
  "IDEAFORGE",
  "SHADOWFAX",
  "NEPHROPLUS",
  "TURTLEMINT",
]);

// Universe mirrors the canonical CapIQ model ("TLF New Economy Index Data" —
// 54 names, sub-sectors and IPO prices as defined there). The index includes
// the top 50 by market cap, reconstituted quarterly. Keep in sync with the model.
type Seed = readonly [
  name: string,
  displayName: string,
  ticker: string,
  yfTicker: string,
  listedDate: string,
  ipoPrice: number | null,
];

function withSector(sector: Sector, rows: readonly Seed[]): Company[] {
  return rows.map(([name, displayName, ticker, yfTicker, listedDate, ipoPrice]) => ({
    name, displayName, ticker, yfTicker, sector, listedDate, ipoPrice,
    isPortfolio: PORTFOLIO_TICKERS.has(ticker),
  }));
}

export const COMPANIES: Company[] = [
  ...withSector("Platforms", [
    ["Info Edge (India) Limited", "Info Edge (Naukri)", "NAUKRI", "NAUKRI.NS", "2006-11-21", null],
    ["Just Dial Limited", "Just Dial", "JUSTDIAL", "JUSTDIAL.NS", "2013-06-05", null],
    ["Matrimony.com Limited", "Matrimony.com", "MATRIMONY", "MATRIMONY.NS", "2017-09-21", null],
    ["Nazara Technologies Limited", "Nazara", "NAZARA", "NAZARA.NS", "2021-03-30", 137.625],
    ["Eternal Limited", "Eternal (Zomato)", "ETERNAL", "ETERNAL.NS", "2021-07-23", 76],
    ["CarTrade Tech Limited", "CarTrade", "CARTRADE", "CARTRADE.NS", "2021-08-20", 1618],
    ["FSN E-Commerce Ventures Limited", "Nykaa", "NYKAA", "NYKAA.NS", "2021-11-10", 187.5],
    ["PB Fintech Limited", "PB Fintech (Policybazaar)", "POLICYBZR", "POLICYBZR.NS", "2021-11-15", 980],
    ["Yatra Online Limited", "Yatra", "YATRA", "YATRA.NS", "2023-09-28", 142],
    ["Le Travenues Technology Limited", "ixigo", "IXIGO", "IXIGO.NS", "2024-06-18", 93],
    ["Unicommerce eSolutions Limited", "Unicommerce", "UNIECOM", "UNIECOM.NS", "2024-08-13", 108],
    ["Swiggy Limited", "Swiggy", "SWIGGY", "SWIGGY.NS", "2024-11-13", 390],
    ["Urban Company Limited", "Urban Company", "URBANCO", "URBANCO.NS", "2025-09-17", 103],
    ["Physicswallah Limited", "Physics Wallah", "PWL", "PWL.NS", "2025-11-18", 109],
    ["Meesho Limited", "Meesho", "MEESHO", "MEESHO.NS", "2025-12-10", 111],
  ]),

  ...withSector("Consumer Brands", [
    ["Honasa Consumer Limited", "Mamaearth (Honasa)", "HONASA", "HONASA.NS", "2023-11-07", 324],
    ["Ola Electric Mobility Limited", "Ola Electric", "OLAELEC", "OLAELEC.NS", "2024-08-09", 76],
    ["Brainbees Solutions Limited", "FirstCry", "FIRSTCRY", "FIRSTCRY.NS", "2024-08-13", 465],
    ["Ather Energy Limited", "Ather Energy", "ATHERENERG", "ATHERENERG.NS", "2025-05-06", 321],
    ["BlueStone Jewellery and Lifestyle Limited", "BlueStone", "BLUESTONE", "BLUESTONE.NS", "2025-08-19", 517],
    ["Lenskart Solutions Limited", "Lenskart", "LENSKART", "LENSKART.NS", "2025-11-10", 402],
    ["Wakefit Innovations Limited", "Wakefit", "WAKEFIT", "WAKEFIT.NS", "2025-12-15", 195],
  ]),

  ...withSector("Fintech", [
    ["Angel One Limited", "Angel One", "ANGELONE", "ANGELONE.NS", "2020-10-05", null],
    ["One97 Communications Limited", "Paytm", "PAYTM", "PAYTM.NS", "2021-11-18", 2150],
    ["Zaggle Prepaid Ocean Services Limited", "Zaggle", "ZAGGLE", "ZAGGLE.NS", "2023-09-22", 164],
    ["Go Digit General Insurance Limited", "Go Digit", "GODIGIT", "GODIGIT.NS", "2024-05-23", 272],
    ["One MobiKwik Systems Limited", "MobiKwik", "MOBIKWIK", "MOBIKWIK.NS", "2024-12-18", 279],
    ["Billionbrains Garage Ventures Limited", "Groww", "GROWW", "GROWW.NS", "2025-11-12", 100],
    ["Pine Labs Limited", "Pine Labs", "PINELABS", "PINELABS.NS", "2025-11-14", 221],
    ["Turtlemint Fintech Solutions Limited", "Turtlemint", "TURTLEMINT", "TURTLEMINT.NS", "2026-06-29", 152],
    ["OnEMI Technology Solutions Limited", "Kissht", "KISSHT", "KISSHT.NS", "2026-05-08", 171],
  ]),

  ...withSector("B2B", [
    ["IndiaMART InterMESH Limited", "IndiaMART", "INDIAMART", "INDIAMART.NS", "2019-07-04", null],
    ["Delhivery Limited", "Delhivery", "DELHIVERY", "DELHIVERY.NS", "2022-05-24", 487],
    ["TBO Tek Limited", "TBO Tek", "TBOTEK", "TBOTEK.NS", "2024-05-15", 920],
    ["Awfis Space Solutions Limited", "Awfis", "AWFIS", "AWFIS.NS", "2024-05-30", 383],
    ["BlackBuck Limited", "BlackBuck", "BLACKBUCK", "BLACKBUCK.NS", "2024-11-22", 273],
    ["Smartworks Coworking Spaces Limited", "Smartworks", "SMARTWORKS", "SMARTWORKS.NS", "2025-07-17", 407],
    ["IndiQube Spaces Limited", "IndiQube", "INDIQUBE", "INDIQUBE.NS", "2025-07-30", 237],
    ["Aequs Limited", "Aequs", "AEQUS", "AEQUS.NS", "2025-12-10", 124],
    ["Shadowfax Technologies Limited", "Shadowfax", "SHADOWFAX", "SHADOWFAX.NS", "2026-01-28", 124],
  ]),

  ...withSector("SaaS", [
    ["Quick Heal Technologies Limited", "Quick Heal", "QUICKHEAL", "QUICKHEAL.NS", "2016-02-18", null],
    ["Affle 3i Limited", "Affle", "AFFLE", "AFFLE.NS", "2019-08-08", null],
    ["RateGain Travel Technologies Limited", "RateGain", "RATEGAIN", "RATEGAIN.NS", "2021-12-17", 425],
    ["Tracxn Technologies Limited", "Tracxn", "TRACXN", "TRACXN.NS", "2022-10-20", 80],
    ["Capillary Technologies India Limited", "Capillary", "CAPILLARY", "CAPILLARY.NS", "2025-11-21", 577],
    ["Amagi Media Labs Limited", "Amagi", "AMAGI", "AMAGI.NS", "2026-01-21", 361],
    ["Fractal Analytics Limited", "Fractal Analytics", "FRACTAL", "FRACTAL.NS", "2026-02-16", 900],
  ]),

  ...withSector("Healthcare", [
    ["Medi Assist Healthcare Services Limited", "Medi Assist", "MEDIASSIST", "MEDIASSIST.NS", "2024-01-23", 418],
    ["Nephrocare Health Services Limited", "NephroPlus", "NEPHROPLUS", "NEPHROPLUS.NS", "2025-12-17", 460],
  ]),

  ...withSector("Deep Tech", [
    ["C. E. Info Systems Limited", "MapmyIndia", "MAPMYINDIA", "MAPMYINDIA.NS", "2021-12-21", 1033],
    ["ideaForge Technology Limited", "ideaForge", "IDEAFORGE", "IDEAFORGE.NS", "2023-07-07", 672],
    ["Unimech Aerospace and Manufacturing Limited", "Unimech Aerospace", "UNIMECH", "UNIMECH.NS", "2024-12-31", 785],
    ["SEDEMAC Mechatronics Limited", "SEDEMAC", "SEDEMAC", "SEDEMAC.NS", "2026-03-11", 1352],
    ["E2E Networks Limited", "E2E Networks", "E2E", "E2E.NS", "2018-05-01", null],
  ]),

];

export const INDEX_BASE_DATE = "2020-12-31";
export const INDEX_ANCHOR_DATE = "2020-12-31";
export const INDEX_BASE_VALUE = 1000;
// The index holds the top 50 by market cap (of the 54-name universe). Used as the
// copy fallback for the live constituent count so headings never flash "54".
export const INDEX_SIZE = 50;
