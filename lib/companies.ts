export type Sector =
  | "Platforms"
  | "Consumer Brands"
  | "Fintech"
  | "B2B"
  | "BFSI"
  | "Software"
  | "Others";

export interface Company {
  name: string;
  ticker: string;       // NSE ticker (no suffix)
  yfTicker: string;     // Yahoo Finance ticker (with .NS suffix)
  sector: Sector;
  listedDate: string;   // ISO date: first trading day on NSE/BSE
}

export const COMPANIES: Company[] = [
  // PLATFORMS
  { name: "Eternal (Zomato)",         ticker: "ETERNAL",     yfTicker: "ETERNAL.NS",     sector: "Platforms",       listedDate: "2021-07-23" },
  { name: "Swiggy",                   ticker: "SWIGGY",      yfTicker: "SWIGGY.NS",      sector: "Platforms",       listedDate: "2024-11-13" },
  { name: "PB Fintech (PolicyBazaar)",ticker: "POLICYBZR",   yfTicker: "POLICYBZR.NS",   sector: "Platforms",       listedDate: "2021-11-15" },
  { name: "Meesho",                   ticker: "MEESHO",      yfTicker: "MEESHO.NS",      sector: "Platforms",       listedDate: "2025-06-11" },
  { name: "Nykaa",                    ticker: "NYKAA",       yfTicker: "NYKAA.NS",       sector: "Platforms",       listedDate: "2021-11-10" },
  { name: "Urban Company",            ticker: "URBANCO",     yfTicker: "URBANCO.NS",     sector: "Platforms",       listedDate: "2025-09-17" },

  // CONSUMER BRANDS
  { name: "FirstCry",                 ticker: "FIRSTCRY",    yfTicker: "FIRSTCRY.NS",    sector: "Consumer Brands", listedDate: "2024-08-13" },
  { name: "TBO.com",                  ticker: "TBOTEK",      yfTicker: "TBOTEK.NS",      sector: "Consumer Brands", listedDate: "2024-05-15" },
  { name: "Physics Wallah",           ticker: "PWL",         yfTicker: "PWL.NS",         sector: "Consumer Brands", listedDate: "2025-11-13" },
  { name: "Indigo Paints",            ticker: "INDIGOPNTS",  yfTicker: "INDIGOPNTS.NS",  sector: "Consumer Brands", listedDate: "2021-01-22" },
  { name: "Go Colors",                ticker: "GOCOLORS",    yfTicker: "GOCOLORS.NS",    sector: "Consumer Brands", listedDate: "2021-11-30" },
  { name: "Sula Vineyards",           ticker: "SULA",        yfTicker: "SULA.NS",        sector: "Consumer Brands", listedDate: "2022-12-22" },
  { name: "Wakefit",                  ticker: "WAKEFIT",     yfTicker: "WAKEFIT.NS",     sector: "Consumer Brands", listedDate: "2025-07-10" },
  { name: "BlackBuck",                ticker: "BLACKBUCK",   yfTicker: "BLACKBUCK.NS",   sector: "Consumer Brands", listedDate: "2024-11-22" },
  { name: "Ola Electric",             ticker: "OLAELEC",     yfTicker: "OLAELEC.NS",     sector: "Consumer Brands", listedDate: "2024-08-09" },
  { name: "Bikaji Foods",             ticker: "BIKAJI",      yfTicker: "BIKAJI.NS",      sector: "Consumer Brands", listedDate: "2022-11-07" },
  { name: "Tracxn Technologies",      ticker: "TRACXN",      yfTicker: "TRACXN.NS",      sector: "Consumer Brands", listedDate: "2022-10-20" },
  { name: "Mamaearth (Honasa)",       ticker: "HONASA",      yfTicker: "HONASA.NS",      sector: "Consumer Brands", listedDate: "2023-11-07" },
  { name: "BlueStone Jewellery",      ticker: "BLUESTONE",   yfTicker: "BLUESTONE.NS",   sector: "Consumer Brands", listedDate: "2025-06-25" },
  { name: "ixigo",                    ticker: "IXIGO",       yfTicker: "IXIGO.NS",       sector: "Consumer Brands", listedDate: "2024-06-18" },
  { name: "Yatra Online",             ticker: "YATRA",       yfTicker: "YATRA.NS",       sector: "Consumer Brands", listedDate: "2023-09-21" },
  { name: "Ather Energy",             ticker: "ATHERENERG",  yfTicker: "ATHERENERG.NS",  sector: "Consumer Brands", listedDate: "2025-05-06" },

  // FINTECH
  { name: "Groww",                    ticker: "GROWW",       yfTicker: "GROWW.NS",       sector: "Fintech",         listedDate: "2025-06-12" },
  { name: "Paytm",                    ticker: "PAYTM",       yfTicker: "PAYTM.NS",       sector: "Fintech",         listedDate: "2021-11-18" },
  { name: "Pine Labs",                ticker: "PINELABS",    yfTicker: "PINELABS.NS",    sector: "Fintech",         listedDate: "2025-07-24" },
  { name: "Zaggle",                   ticker: "ZAGGLE",      yfTicker: "ZAGGLE.NS",      sector: "Fintech",         listedDate: "2023-09-22" },
  { name: "MobiKwik",                 ticker: "MOBIKWIK",    yfTicker: "MOBIKWIK.NS",    sector: "Fintech",         listedDate: "2024-12-18" },
  { name: "Kissht (OnEMI)",           ticker: "KISSHT",      yfTicker: "KISSHT.NS",      sector: "Fintech",         listedDate: "2026-05-08" },

  // B2B
  { name: "Delhivery",                ticker: "DELHIVERY",   yfTicker: "DELHIVERY.NS",   sector: "B2B",             listedDate: "2022-05-24" },
  { name: "IndiaMart",                ticker: "INDIAMART",   yfTicker: "INDIAMART.NS",   sector: "B2B",             listedDate: "2019-07-04" },
  { name: "Awfis",                    ticker: "AWFIS",       yfTicker: "AWFIS.NS",       sector: "B2B",             listedDate: "2024-05-30" },
  { name: "Medi Assist",              ticker: "MEDIASSIST",  yfTicker: "MEDIASSIST.NS",  sector: "B2B",             listedDate: "2024-02-15" },
  { name: "IdeaForge",                ticker: "IDEAFORGE",   yfTicker: "IDEAFORGE.NS",   sector: "B2B",             listedDate: "2023-06-26" },
  { name: "IndiQube",                 ticker: "INDIQUBE",    yfTicker: "INDIQUBE.NS",    sector: "B2B",             listedDate: "2024-08-19" },
  { name: "UniCommerce",              ticker: "UNIECOM",     yfTicker: "UNIECOM.NS",     sector: "B2B",             listedDate: "2024-08-13" },
  { name: "Shadowfax",                ticker: "SHADOWFAX",   yfTicker: "SHADOWFAX.NS",   sector: "B2B",             listedDate: "2026-01-28" },

  // BFSI
  { name: "Go Digit Insurance",       ticker: "GODIGIT",     yfTicker: "GODIGIT.NS",     sector: "BFSI",            listedDate: "2024-05-23" },
  { name: "Aadhar Housing Finance",   ticker: "AADHARHFC",   yfTicker: "AADHARHFC.NS",   sector: "BFSI",            listedDate: "2024-05-15" },
  { name: "Five Star Business Finance",ticker:"FIVESTAR",    yfTicker: "FIVESTAR.NS",    sector: "BFSI",            listedDate: "2022-11-21" },
  { name: "HomFirst Finance",         ticker: "HOMEFIRST",   yfTicker: "HOMEFIRST.NS",   sector: "BFSI",            listedDate: "2022-02-03" },
  { name: "India Shelter Finance",    ticker: "INDIASHLTR",  yfTicker: "INDIASHLTR.NS",  sector: "BFSI",            listedDate: "2023-12-20" },
  { name: "Northern Arc Capital",     ticker: "NORTHARC",    yfTicker: "NORTHARC.NS",    sector: "BFSI",            listedDate: "2024-09-19" },
  { name: "AYE Finance",              ticker: "AYE",         yfTicker: "AYE.NS",         sector: "BFSI",            listedDate: "2026-02-26" },

  // SOFTWARE
  { name: "MapMyIndia",               ticker: "MAPMYINDIA",  yfTicker: "MAPMYINDIA.NS",  sector: "Software",        listedDate: "2021-12-21" },
  { name: "Fractal Analytics",        ticker: "FRACTAL",     yfTicker: "FRACTAL.NS",     sector: "Software",        listedDate: "2026-01-14" },
  { name: "Capillary Technologies",   ticker: "CAPILLARY",   yfTicker: "CAPILLARY.NS",   sector: "Software",        listedDate: "2025-02-18" },
  { name: "Amagi",                    ticker: "AMAGI",       yfTicker: "AMAGI.NS",       sector: "Software",        listedDate: "2026-01-22" },
  { name: "RateGain",                 ticker: "RATEGAIN",    yfTicker: "RATEGAIN.NS",    sector: "Software",        listedDate: "2021-12-17" },
  { name: "Lenskart",                 ticker: "LENSKART",    yfTicker: "LENSKART.NS",    sector: "Software",        listedDate: "2025-10-08" },

  // OTHERS
  { name: "Info Edge (Naukri)",       ticker: "NAUKRI",      yfTicker: "NAUKRI.NS",      sector: "Others",          listedDate: "2006-11-21" },
  { name: "Nazara Technologies",      ticker: "NAZARA",      yfTicker: "NAZARA.NS",      sector: "Others",          listedDate: "2021-03-30" },
  { name: "CarTrade.com",             ticker: "CARTRADE",    yfTicker: "CARTRADE.NS",    sector: "Others",          listedDate: "2021-08-20" },
  { name: "SEDEMAC Mechatronics",     ticker: "SEDEMAC",     yfTicker: "SEDEMAC.NS",     sector: "Others",          listedDate: "2026-03-11" },
];

export const SECTORS: Sector[] = [
  "Platforms",
  "Consumer Brands",
  "Fintech",
  "B2B",
  "BFSI",
  "Software",
  "Others",
];

export const SECTOR_COLORS: Record<Sector, string> = {
  "Platforms":       "#6366f1",
  "Consumer Brands": "#f59e0b",
  "Fintech":         "#10b981",
  "B2B":             "#3b82f6",
  "BFSI":            "#ec4899",
  "Software":        "#8b5cf6",
  "Others":          "#6b7280",
};

// Base date for index calculation
export const INDEX_BASE_DATE = "2021-03-01"; // March 2021 inception
export const INDEX_BASE_VALUE = 1000;
export const INDEX_NAME = "New Economy Index";
export const INDEX_SHORT = "NEI";
