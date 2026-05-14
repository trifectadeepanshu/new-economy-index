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
  ticker: string;          // NSE ticker (no suffix)
  yfTicker: string;        // Yahoo Finance ticker — kept for backfill script
  instrumentKey: string;   // Upstox instrument key: NSE_EQ|{ISIN}
  sector: Sector;
  listedDate: string;      // ISO date: first trading day on NSE/BSE
}

export const COMPANIES: Company[] = [
  // PLATFORMS
  { name: "Eternal (Zomato)",          ticker: "ETERNAL",    yfTicker: "ETERNAL.NS",    instrumentKey: "NSE_EQ|INE758T01015", sector: "Platforms",       listedDate: "2021-07-23" },
  { name: "Swiggy",                    ticker: "SWIGGY",     yfTicker: "SWIGGY.NS",     instrumentKey: "NSE_EQ|INE00H001014", sector: "Platforms",       listedDate: "2024-11-13" },
  { name: "PB Fintech (PolicyBazaar)", ticker: "POLICYBZR",  yfTicker: "POLICYBZR.NS",  instrumentKey: "NSE_EQ|INE417T01026", sector: "Platforms",       listedDate: "2021-11-15" },
  { name: "Meesho",                    ticker: "MEESHO",     yfTicker: "MEESHO.NS",     instrumentKey: "NSE_EQ|INE0VDM01015", sector: "Platforms",       listedDate: "2025-06-11" },
  { name: "Nykaa",                     ticker: "NYKAA",      yfTicker: "NYKAA.NS",      instrumentKey: "NSE_EQ|INE388Y01029", sector: "Platforms",       listedDate: "2021-11-10" },
  { name: "Urban Company",             ticker: "URBANCO",    yfTicker: "URBANCO.NS",    instrumentKey: "NSE_EQ|INE0CAZ01013", sector: "Platforms",       listedDate: "2025-09-17" },

  // CONSUMER BRANDS
  { name: "FirstCry",                  ticker: "FIRSTCRY",   yfTicker: "FIRSTCRY.NS",   instrumentKey: "NSE_EQ|INE02RE01045", sector: "Consumer Brands", listedDate: "2024-08-13" },
  { name: "TBO.com",                   ticker: "TBOTEK",     yfTicker: "TBOTEK.NS",     instrumentKey: "NSE_EQ|INE673O01025", sector: "Consumer Brands", listedDate: "2024-05-15" },
  { name: "Physics Wallah",            ticker: "PWL",        yfTicker: "PWL.NS",        instrumentKey: "NSE_EQ|INE0LP301011", sector: "Consumer Brands", listedDate: "2025-11-13" },
  { name: "Indigo Paints",             ticker: "INDIGOPNTS", yfTicker: "INDIGOPNTS.NS", instrumentKey: "NSE_EQ|INE09VQ01012", sector: "Consumer Brands", listedDate: "2021-01-22" },
  { name: "Go Colors",                 ticker: "GOCOLORS",   yfTicker: "GOCOLORS.NS",   instrumentKey: "NSE_EQ|INE0BJS01011", sector: "Consumer Brands", listedDate: "2021-11-30" },
  { name: "Sula Vineyards",            ticker: "SULA",       yfTicker: "SULA.NS",       instrumentKey: "NSE_EQ|INE142Q01026", sector: "Consumer Brands", listedDate: "2022-12-22" },
  { name: "Wakefit",                   ticker: "WAKEFIT",    yfTicker: "WAKEFIT.NS",    instrumentKey: "NSE_EQ|INE0E7301029", sector: "Consumer Brands", listedDate: "2025-07-10" },
  { name: "BlackBuck",                 ticker: "BLACKBUCK",  yfTicker: "BLACKBUCK.NS",  instrumentKey: "NSE_EQ|INE0UIZ01018", sector: "Consumer Brands", listedDate: "2024-11-22" },
  { name: "Ola Electric",              ticker: "OLAELEC",    yfTicker: "OLAELEC.NS",    instrumentKey: "NSE_EQ|INE0LXG01040", sector: "Consumer Brands", listedDate: "2024-08-09" },
  { name: "Bikaji Foods",              ticker: "BIKAJI",     yfTicker: "BIKAJI.NS",     instrumentKey: "NSE_EQ|INE00E101023", sector: "Consumer Brands", listedDate: "2022-11-07" },
  { name: "Tracxn Technologies",       ticker: "TRACXN",     yfTicker: "TRACXN.NS",     instrumentKey: "NSE_EQ|INE0HMF01019", sector: "Consumer Brands", listedDate: "2022-10-20" },
  { name: "Mamaearth (Honasa)",        ticker: "HONASA",     yfTicker: "HONASA.NS",     instrumentKey: "NSE_EQ|INE0J5401028", sector: "Consumer Brands", listedDate: "2023-11-07" },
  { name: "BlueStone Jewellery",       ticker: "BLUESTONE",  yfTicker: "BLUESTONE.NS",  instrumentKey: "NSE_EQ|INE304W01038", sector: "Consumer Brands", listedDate: "2025-06-25" },
  { name: "ixigo",                     ticker: "IXIGO",      yfTicker: "IXIGO.NS",      instrumentKey: "NSE_EQ|INE0HV901016", sector: "Consumer Brands", listedDate: "2024-06-18" },
  { name: "Yatra Online",              ticker: "YATRA",      yfTicker: "YATRA.NS",      instrumentKey: "NSE_EQ|INE0JR601024", sector: "Consumer Brands", listedDate: "2023-09-21" },
  { name: "Ather Energy",              ticker: "ATHERENERG", yfTicker: "ATHERENERG.NS", instrumentKey: "NSE_EQ|INE0LEZ01016", sector: "Consumer Brands", listedDate: "2025-05-06" },

  // FINTECH
  { name: "Groww",                     ticker: "GROWW",      yfTicker: "GROWW.NS",      instrumentKey: "NSE_EQ|INE0HOQ01053", sector: "Fintech",         listedDate: "2025-06-12" },
  { name: "Paytm",                     ticker: "PAYTM",      yfTicker: "PAYTM.NS",      instrumentKey: "NSE_EQ|INE982J01020", sector: "Fintech",         listedDate: "2021-11-18" },
  { name: "Pine Labs",                 ticker: "PINELABS",   yfTicker: "PINELABS.NS",   instrumentKey: "NSE_EQ|INE15B701018", sector: "Fintech",         listedDate: "2025-07-24" },
  { name: "Zaggle",                    ticker: "ZAGGLE",     yfTicker: "ZAGGLE.NS",     instrumentKey: "NSE_EQ|INE07K301024", sector: "Fintech",         listedDate: "2023-09-22" },
  { name: "MobiKwik",                  ticker: "MOBIKWIK",   yfTicker: "MOBIKWIK.NS",   instrumentKey: "NSE_EQ|INE0HLU01028", sector: "Fintech",         listedDate: "2024-12-18" },
  { name: "Kissht (OnEMI)",            ticker: "KISSHT",     yfTicker: "KISSHT.NS",     instrumentKey: "NSE_EQ|INE12F801023", sector: "Fintech",         listedDate: "2026-05-08" },

  // B2B
  { name: "Delhivery",                 ticker: "DELHIVERY",  yfTicker: "DELHIVERY.NS",  instrumentKey: "NSE_EQ|INE148O01028", sector: "B2B",             listedDate: "2022-05-24" },
  { name: "IndiaMart",                 ticker: "INDIAMART",  yfTicker: "INDIAMART.NS",  instrumentKey: "NSE_EQ|INE933S01016", sector: "B2B",             listedDate: "2019-07-04" },
  { name: "Awfis",                     ticker: "AWFIS",      yfTicker: "AWFIS.NS",      instrumentKey: "NSE_EQ|INE108V01019", sector: "B2B",             listedDate: "2024-05-30" },
  { name: "Medi Assist",               ticker: "MEDIASSIST", yfTicker: "MEDIASSIST.NS", instrumentKey: "NSE_EQ|INE456Z01021", sector: "B2B",             listedDate: "2024-02-15" },
  { name: "IdeaForge",                 ticker: "IDEAFORGE",  yfTicker: "IDEAFORGE.NS",  instrumentKey: "NSE_EQ|INE349Y01013", sector: "B2B",             listedDate: "2023-06-26" },
  { name: "IndiQube",                  ticker: "INDIQUBE",   yfTicker: "INDIQUBE.NS",   instrumentKey: "NSE_EQ|INE06ST01018", sector: "B2B",             listedDate: "2024-08-19" },
  { name: "UniCommerce",               ticker: "UNIECOM",    yfTicker: "UNIECOM.NS",    instrumentKey: "NSE_EQ|INE00U401027", sector: "B2B",             listedDate: "2024-08-13" },
  { name: "Shadowfax",                 ticker: "SHADOWFAX",  yfTicker: "SHADOWFAX.NS",  instrumentKey: "NSE_EQ|INE12UN01015", sector: "B2B",             listedDate: "2026-01-28" },

  // BFSI
  { name: "Go Digit Insurance",        ticker: "GODIGIT",    yfTicker: "GODIGIT.NS",    instrumentKey: "NSE_EQ|INE03JT01014", sector: "BFSI",            listedDate: "2024-05-23" },
  { name: "Aadhar Housing Finance",    ticker: "AADHARHFC",  yfTicker: "AADHARHFC.NS",  instrumentKey: "NSE_EQ|INE883F01010", sector: "BFSI",            listedDate: "2024-05-15" },
  { name: "Five Star Business Finance",ticker: "FIVESTAR",   yfTicker: "FIVESTAR.NS",   instrumentKey: "NSE_EQ|INE128S01021", sector: "BFSI",            listedDate: "2022-11-21" },
  { name: "HomFirst Finance",          ticker: "HOMEFIRST",  yfTicker: "HOMEFIRST.NS",  instrumentKey: "NSE_EQ|INE481N01025", sector: "BFSI",            listedDate: "2022-02-03" },
  { name: "India Shelter Finance",     ticker: "INDIASHLTR", yfTicker: "INDIASHLTR.NS", instrumentKey: "NSE_EQ|INE922K01024", sector: "BFSI",            listedDate: "2023-12-20" },
  { name: "Northern Arc Capital",      ticker: "NORTHARC",   yfTicker: "NORTHARC.NS",   instrumentKey: "NSE_EQ|INE850M01015", sector: "BFSI",            listedDate: "2024-09-19" },
  { name: "AYE Finance",               ticker: "AYE",        yfTicker: "AYE.NS",        instrumentKey: "NSE_EQ|INE501X01029", sector: "BFSI",            listedDate: "2026-02-26" },

  // SOFTWARE
  { name: "MapMyIndia",                ticker: "MAPMYINDIA", yfTicker: "MAPMYINDIA.NS", instrumentKey: "NSE_EQ|INE0BV301023", sector: "Software",        listedDate: "2021-12-21" },
  { name: "Fractal Analytics",         ticker: "FRACTAL",    yfTicker: "FRACTAL.NS",    instrumentKey: "NSE_EQ|INE212S01015", sector: "Software",        listedDate: "2026-01-14" },
  { name: "Capillary Technologies",    ticker: "CAPILLARY",  yfTicker: "CAPILLARY.NS",  instrumentKey: "NSE_EQ|INE0ILV01024", sector: "Software",        listedDate: "2025-02-18" },
  { name: "Amagi",                     ticker: "AMAGI",      yfTicker: "AMAGI.NS",      instrumentKey: "NSE_EQ|INE121R01077", sector: "Software",        listedDate: "2026-01-22" },
  { name: "RateGain",                  ticker: "RATEGAIN",   yfTicker: "RATEGAIN.NS",   instrumentKey: "NSE_EQ|INE0CLI01024", sector: "Software",        listedDate: "2021-12-17" },
  { name: "Lenskart",                  ticker: "LENSKART",   yfTicker: "LENSKART.NS",   instrumentKey: "NSE_EQ|INE956O01016", sector: "Software",        listedDate: "2025-10-08" },

  // OTHERS
  { name: "Info Edge (Naukri)",        ticker: "NAUKRI",     yfTicker: "NAUKRI.NS",     instrumentKey: "NSE_EQ|INE663F01032", sector: "Others",          listedDate: "2006-11-21" },
  { name: "Nazara Technologies",       ticker: "NAZARA",     yfTicker: "NAZARA.NS",     instrumentKey: "NSE_EQ|INE418L01047", sector: "Others",          listedDate: "2021-03-30" },
  { name: "CarTrade.com",              ticker: "CARTRADE",   yfTicker: "CARTRADE.NS",   instrumentKey: "NSE_EQ|INE290S01011", sector: "Others",          listedDate: "2021-08-20" },
  { name: "SEDEMAC Mechatronics",      ticker: "SEDEMAC",    yfTicker: "SEDEMAC.NS",    instrumentKey: "NSE_EQ|INE00XB01019", sector: "Others",          listedDate: "2026-03-11" },
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
