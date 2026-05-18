export const SECTORS = [
  "Platforms",
  "Consumer Brands",
  "Fintech",
  "B2B",
  "SaaS",
  "Healthcare",
  "Edtech",
  "Gaming",
  "Deep Tech",
] as const;

export type Sector = (typeof SECTORS)[number];

export type Company = {
  name: string;
  ticker: string;
  yfTicker: string;
  sector: Sector;
  listedDate: string;
  isPortfolio: boolean;
};

export const PORTFOLIO_TICKERS = new Set([
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
]);

type CompanySeed = readonly [
  name: string,
  ticker: string,
  listedDate: string,
  yfTicker?: string,
];

const INDEX_YAHOO_SUFFIX = ".NS";

function withSector(sector: Sector, rows: readonly CompanySeed[]): Company[] {
  return rows.map(([name, ticker, listedDate, yfTicker]) => ({
    name,
    ticker,
    yfTicker: yfTicker ?? `${ticker}${INDEX_YAHOO_SUFFIX}`,
    sector,
    listedDate,
    isPortfolio: PORTFOLIO_TICKERS.has(ticker),
  }));
}

export const COMPANIES: Company[] = [
  ...withSector("Platforms", [
    ["Eternal (Zomato)", "ETERNAL", "2021-07-23"],
    ["Swiggy", "SWIGGY", "2024-11-13"],
    ["PB Fintech (PolicyBazaar)", "POLICYBZR", "2021-11-15"],
    ["Meesho", "MEESHO", "2025-06-11"],
    ["Nykaa", "NYKAA", "2021-11-10"],
    ["Urban Company", "URBANCO", "2025-09-17"],
    ["Info Edge (Naukri)", "NAUKRI", "2006-11-21"],
    ["CarTrade.com", "CARTRADE", "2021-08-20"],
    ["ixigo", "IXIGO", "2024-06-18"],
    ["Yatra Online", "YATRA", "2023-09-21"],
  ]),

  ...withSector("Consumer Brands", [
    ["FirstCry", "FIRSTCRY", "2024-08-13"],
    ["Indigo Paints", "INDIGOPNTS", "2021-01-22"],
    ["Go Colors", "GOCOLORS", "2021-11-30"],
    ["Sula Vineyards", "SULA", "2022-12-22"],
    ["Wakefit", "WAKEFIT", "2025-07-10"],
    ["Ola Electric", "OLAELEC", "2024-08-09"],
    ["Bikaji Foods", "BIKAJI", "2022-11-07"],
    ["Mamaearth (Honasa)", "HONASA", "2023-11-07"],
    ["BlueStone Jewellery", "BLUESTONE", "2025-06-25"],
    ["Ather Energy", "ATHERENERG", "2025-05-06"],
    ["Lenskart", "LENSKART", "2025-10-08"],
  ]),

  ...withSector("Fintech", [
    ["Paytm", "PAYTM", "2021-11-18"],
    ["Groww", "GROWW", "2025-06-12"],
    ["Pine Labs", "PINELABS", "2025-07-24"],
    ["Zaggle", "ZAGGLE", "2023-09-22"],
    ["MobiKwik", "MOBIKWIK", "2024-12-18"],
    ["Kissht (OnEMI)", "KISSHT", "2026-05-08"],
    ["Go Digit Insurance", "GODIGIT", "2024-05-23"],
    ["Aadhar Housing Finance", "AADHARHFC", "2024-05-15"],
    ["Five Star Business Finance", "FIVESTAR", "2022-11-21"],
    ["HomFirst Finance", "HOMEFIRST", "2022-02-03"],
    ["India Shelter Finance", "INDIASHLTR", "2023-12-20"],
    ["Northern Arc Capital", "NORTHARC", "2024-09-19"],
    ["AYE Finance", "AYE", "2026-02-26"],
  ]),

  ...withSector("B2B", [
    ["Delhivery", "DELHIVERY", "2022-05-24"],
    ["IndiaMart", "INDIAMART", "2019-07-04"],
    ["TBO.com", "TBOTEK", "2024-05-15"],
    ["BlackBuck", "BLACKBUCK", "2024-11-22"],
    ["Awfis", "AWFIS", "2024-05-30"],
    ["IdeaForge", "IDEAFORGE", "2023-06-26"],
    ["IndiQube", "INDIQUBE", "2024-08-19"],
    ["UniCommerce", "UNIECOM", "2024-08-13"],
    ["Shadowfax", "SHADOWFAX", "2026-01-28"],
  ]),

  ...withSector("SaaS", [
    ["MapMyIndia", "MAPMYINDIA", "2021-12-21"],
    ["Fractal Analytics", "FRACTAL", "2026-01-14"],
    ["Capillary Technologies", "CAPILLARY", "2025-02-18"],
    ["Amagi", "AMAGI", "2026-01-22"],
    ["RateGain", "RATEGAIN", "2021-12-17"],
    ["Tracxn Technologies", "TRACXN", "2022-10-20"],
  ]),

  ...withSector("Healthcare", [
    ["Medi Assist", "MEDIASSIST", "2024-02-15"],
    ["NephroPlus (Nephrocare Health Services)", "NEPHROPLUS", "2025-12-17"],
  ]),

  ...withSector("Edtech", [
    ["Physics Wallah", "PWL", "2025-11-13"],
  ]),

  ...withSector("Gaming", [
    ["Nazara Technologies", "NAZARA", "2021-03-30"],
  ]),

  ...withSector("Deep Tech", [
    ["SEDEMAC Mechatronics", "SEDEMAC", "2026-03-11"],
  ]),
];

export const INDEX_BASE_DATE = "2021-03-01";
export const INDEX_BASE_VALUE = 1000;
