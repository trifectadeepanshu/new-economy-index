export const SECTORS = [
  "Platforms",
  "Consumer",
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

// Universe mirrors the canonical CapIQ model (73 names). Index includes the
// top 50 by market cap, reconstituted quarterly. Keep in sync with the model.
type Seed = readonly [name: string, displayName: string, ticker: string, yfTicker: string, listedDate: string];

function withSector(sector: Sector, rows: readonly Seed[]): Company[] {
  return rows.map(([name, displayName, ticker, yfTicker, listedDate]) => ({
    name, displayName, ticker, yfTicker, sector, listedDate,
    isPortfolio: PORTFOLIO_TICKERS.has(ticker),
  }));
}

export const COMPANIES: Company[] = [
  ...withSector("Platforms", [
    ["Info Edge (India) Limited", "Info Edge (Naukri)", "NAUKRI", "NAUKRI.NS", "2006-11-21"],
    ["Just Dial Limited", "Just Dial", "JUSTDIAL", "JUSTDIAL.NS", "2013-06-05"],
    ["Matrimony.com Limited", "Matrimony.com", "MATRIMONY", "MATRIMONY.NS", "2017-09-21"],
    ["Indian Railway Catering & Tourism Corporation Limited", "IRCTC", "IRCTC", "IRCTC.NS", "2019-10-14"],
    ["Easy Trip Planners Limited", "EaseMyTrip", "EASEMYTRIP", "EASEMYTRIP.NS", "2021-03-19"],
    ["Eternal Limited", "Eternal (Zomato)", "ETERNAL", "ETERNAL.NS", "2021-07-23"],
    ["CarTrade Tech Limited", "CarTrade", "CARTRADE", "CARTRADE.NS", "2021-08-20"],
    ["FSN E-Commerce Ventures Limited", "Nykaa", "NYKAA", "NYKAA.NS", "2021-11-10"],
    ["PB Fintech Limited", "PB Fintech (Policybazaar)", "POLICYBZR", "POLICYBZR.NS", "2021-11-15"],
    ["Yatra Online Limited", "Yatra", "YATRA", "YATRA.NS", "2023-09-28"],
    ["Le Travenues Technology Limited", "ixigo", "IXIGO", "IXIGO.NS", "2024-06-18"],
    ["Swiggy Limited", "Swiggy", "SWIGGY", "SWIGGY.NS", "2024-11-13"],
    ["Urban Company Limited", "Urban Company", "URBANCO", "URBANCO.NS", "2025-09-17"],
    ["Meesho Limited", "Meesho", "MEESHO", "MEESHO.NS", "2025-12-10"],
  ]),

  ...withSector("Consumer", [
    ["Honasa Consumer Limited", "Mamaearth (Honasa)", "HONASA", "HONASA.NS", "2023-11-07"],
    ["Ola Electric Mobility Limited", "Ola Electric", "OLAELEC", "OLAELEC.NS", "2024-08-09"],
    ["Brainbees Solutions Limited", "FirstCry", "FIRSTCRY", "FIRSTCRY.NS", "2024-08-13"],
    ["Ather Energy Limited", "Ather Energy", "ATHERENERG", "ATHERENERG.NS", "2025-05-06"],
    ["BlueStone Jewellery and Lifestyle Limited", "BlueStone", "BLUESTONE", "BLUESTONE.NS", "2025-08-19"],
    ["Lenskart Solutions Limited", "Lenskart", "LENSKART", "LENSKART.NS", "2025-11-10"],
    ["Wakefit Innovations Limited", "Wakefit", "WAKEFIT", "WAKEFIT.NS", "2025-12-15"],
    ["Physicswallah Limited", "Physics Wallah", "PWL", "PWL.NS", "2025-11-18"],
    ["Excelsoft Technologies Limited", "Excelsoft", "EXCELSOFT", "EXCELSOFT.NS", "2025-11-26"],
  ]),

  ...withSector("Fintech", [
    ["AvenuesAI Limited", "Infibeam Avenues", "539807", "539807.BO", "2016-04-04"],
    ["Central Depository Services (India) Limited", "CDSL", "CDSL", "CDSL.NS", "2017-06-30"],
    ["Angel One Limited", "Angel One", "ANGELONE", "ANGELONE.NS", "2020-10-05"],
    ["One97 Communications Limited", "Paytm", "PAYTM", "PAYTM.NS", "2021-11-18"],
    ["Zaggle Prepaid Ocean Services Limited", "Zaggle", "ZAGGLE", "ZAGGLE.NS", "2023-09-22"],
    ["Protean eGov Technologies Limited", "Protean eGov", "544021", "PROTEAN.NS", "2023-11-13"],
    ["BLS E-Services Limited", "BLS E-Services", "BLSE", "BLSE.NS", "2024-02-06"],
    ["Go Digit General Insurance Limited", "Go Digit", "GODIGIT", "GODIGIT.NS", "2024-05-23"],
    ["One MobiKwik Systems Limited", "MobiKwik", "MOBIKWIK", "MOBIKWIK.NS", "2024-12-18"],
    ["National Securities Depository Limited", "NSDL", "544467", "544467.BO", "2025-08-06"],
    ["Billionbrains Garage Ventures Limited", "Groww", "GROWW", "GROWW.NS", "2025-11-12"],
    ["Pine Labs Limited", "Pine Labs", "PINELABS", "PINELABS.NS", "2025-11-14"],
    ["OnEMI Technology Solutions Limited", "Kissht", "KISSHT", "KISSHT.NS", "2026-05-08"],
  ]),

  ...withSector("B2B", [
    ["IndiaMART InterMESH Limited", "IndiaMART", "INDIAMART", "INDIAMART.NS", "2019-07-04"],
    ["Nazara Technologies Limited", "Nazara", "NAZARA", "NAZARA.NS", "2021-03-30"],
    ["Delhivery Limited", "Delhivery", "DELHIVERY", "DELHIVERY.NS", "2022-05-24"],
    ["Avalon Technologies Limited", "Avalon Technologies", "AVALON", "AVALON.NS", "2023-04-18"],
    ["ideaForge Technology Limited", "ideaForge", "IDEAFORGE", "IDEAFORGE.NS", "2023-07-07"],
    ["Cyient DLM Limited", "Cyient DLM", "CYIENTDLM", "CYIENTDLM.NS", "2023-07-10"],
    ["TBO Tek Limited", "TBO Tek", "TBOTEK", "TBOTEK.NS", "2024-05-15"],
    ["Awfis Space Solutions Limited", "Awfis", "AWFIS", "AWFIS.NS", "2024-05-30"],
    ["Unicommerce eSolutions Limited", "Unicommerce", "UNIECOM", "UNIECOM.NS", "2024-08-13"],
    ["BlackBuck Limited", "BlackBuck", "BLACKBUCK", "BLACKBUCK.NS", "2024-11-22"],
    ["Smartworks Coworking Spaces Limited", "Smartworks", "SMARTWORKS", "SMARTWORKS.NS", "2025-07-17"],
    ["IndiQube Spaces Limited", "IndiQube", "INDIQUBE", "INDIQUBE.NS", "2025-07-30"],
    ["Seshaasai Technologies Limited", "Seshaasai", "STYL", "STYL.NS", "2025-09-30"],
    ["WeWork India Management Limited", "WeWork India", "WEWORK", "WEWORK.NS", "2025-10-10"],
    ["Aequs Limited", "Aequs", "AEQUS", "AEQUS.NS", "2025-12-10"],
    ["Shadowfax Technologies Limited", "Shadowfax", "SHADOWFAX", "SHADOWFAX.NS", "2026-01-28"],
  ]),

  ...withSector("SaaS", [
    ["Quick Heal Technologies Limited", "Quick Heal", "QUICKHEAL", "QUICKHEAL.NS", "2016-02-18"],
    ["Affle 3i Limited", "Affle", "AFFLE", "AFFLE.NS", "2019-08-08"],
    ["Route Mobile Limited", "Route Mobile", "ROUTE", "ROUTE.NS", "2020-09-21"],
    ["RateGain Travel Technologies Limited", "RateGain", "RATEGAIN", "RATEGAIN.NS", "2021-12-17"],
    ["C. E. Info Systems Limited", "MapmyIndia", "MAPMYINDIA", "MAPMYINDIA.NS", "2021-12-21"],
    ["eMudhra Limited", "eMudhra", "EMUDHRA", "EMUDHRA.NS", "2022-06-01"],
    ["Tracxn Technologies Limited", "Tracxn", "TRACXN", "TRACXN.NS", "2022-10-20"],
    ["Capillary Technologies India Limited", "Capillary", "CAPILLARY", "CAPILLARY.NS", "2025-11-21"],
    ["Amagi Media Labs Limited", "Amagi", "AMAGI", "AMAGI.NS", "2026-01-21"],
    ["Fractal Analytics Limited", "Fractal Analytics", "FRACTAL", "FRACTAL.NS", "2026-02-16"],
  ]),

  ...withSector("Healthcare", [
    ["MedPlus Health Services Limited", "MedPlus", "MEDPLUS", "MEDPLUS.NS", "2021-12-23"],
    ["Medi Assist Healthcare Services Limited", "Medi Assist", "MEDIASSIST", "MEDIASSIST.NS", "2024-01-23"],
    ["Entero Healthcare Solutions Limited", "Entero Healthcare", "ENTERO", "ENTERO.NS", "2024-02-16"],
    ["Inventurus Knowledge Solutions Limited", "Inventurus (IKS)", "IKS", "IKS.NS", "2024-12-19"],
    ["Nephrocare Health Services Limited", "NephroPlus", "NEPHROPLUS", "NEPHROPLUS.NS", "2025-12-17"],
  ]),

  ...withSector("Deep Tech", [
    ["Elin Electronics Limited", "Elin Electronics", "ELIN", "ELIN.NS", "2022-12-30"],
    ["Netweb Technologies India Limited", "Netweb", "NETWEB", "NETWEB.NS", "2023-07-27"],
    ["Exicom Tele-Systems Limited", "Exicom", "EXICOM", "EXICOM.NS", "2024-03-05"],
    ["Unimech Aerospace and Manufacturing Limited", "Unimech Aerospace", "UNIMECH", "UNIMECH.NS", "2024-12-31"],
    ["Aditya Infotech Limited", "CP Plus", "CPPLUS", "CPPLUS.NS", "2025-08-05"],
    ["SEDEMAC Mechatronics Limited", "SEDEMAC", "SEDEMAC", "SEDEMAC.NS", "2026-03-11"],
  ]),

];

export const INDEX_BASE_DATE = "2020-12-31";
export const INDEX_ANCHOR_DATE = "2021-01-01";
export const INDEX_BASE_VALUE = 1000;
