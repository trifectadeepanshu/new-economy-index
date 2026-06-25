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
  "IDEAFORGE",
  "IXIGO",
  "BLACKBUCK",
  "MOBIKWIK",
  "BLUESTONE",
  "URBANCO",
  "MEESHO",
  "NEPHROPLUS",
  "SHADOWFAX",
  "KISSHT",
]);

// Universe mirrors the canonical CapIQ model (73 names). Index includes the
// top 50 by market cap, reconstituted quarterly. Keep in sync with the model.
type Seed = readonly [name: string, ticker: string, yfTicker: string, listedDate: string];

function withSector(sector: Sector, rows: readonly Seed[]): Company[] {
  return rows.map(([name, ticker, yfTicker, listedDate]) => ({
    name, ticker, yfTicker, sector, listedDate,
    isPortfolio: PORTFOLIO_TICKERS.has(ticker),
  }));
}

export const COMPANIES: Company[] = [
  ...withSector("Platforms", [
    ["Info Edge (India) Limited", "NAUKRI", "NAUKRI.NS", "2006-11-21"],
    ["Just Dial Limited", "JUSTDIAL", "JUSTDIAL.NS", "2013-06-05"],
    ["Matrimony.com Limited", "MATRIMONY", "MATRIMONY.NS", "2017-09-21"],
    ["Indian Railway Catering & Tourism Corporation Limited", "IRCTC", "IRCTC.NS", "2019-10-14"],
    ["Easy Trip Planners Limited", "EASEMYTRIP", "EASEMYTRIP.NS", "2021-03-19"],
    ["Eternal Limited", "ETERNAL", "ETERNAL.NS", "2021-07-23"],
    ["CarTrade Tech Limited", "CARTRADE", "CARTRADE.NS", "2021-08-20"],
    ["FSN E-Commerce Ventures Limited", "NYKAA", "NYKAA.NS", "2021-11-10"],
    ["PB Fintech Limited", "POLICYBZR", "POLICYBZR.NS", "2021-11-15"],
    ["Yatra Online Limited", "YATRA", "YATRA.NS", "2023-09-28"],
    ["Le Travenues Technology Limited", "IXIGO", "IXIGO.NS", "2024-06-18"],
    ["Swiggy Limited", "SWIGGY", "SWIGGY.NS", "2024-11-13"],
    ["Urban Company Limited", "URBANCO", "URBANCO.NS", "2025-09-17"],
    ["Meesho Limited", "MEESHO", "MEESHO.NS", "2025-12-10"],
  ]),

  ...withSector("Consumer Brands", [
    ["Honasa Consumer Limited", "HONASA", "HONASA.NS", "2023-11-07"],
    ["Ola Electric Mobility Limited", "OLAELEC", "OLAELEC.NS", "2024-08-09"],
    ["Brainbees Solutions Limited", "FIRSTCRY", "FIRSTCRY.NS", "2024-08-13"],
    ["Ather Energy Limited", "ATHERENERG", "ATHERENERG.NS", "2025-05-06"],
    ["BlueStone Jewellery and Lifestyle Limited", "BLUESTONE", "BLUESTONE.NS", "2025-08-19"],
    ["Lenskart Solutions Limited", "LENSKART", "LENSKART.NS", "2025-11-10"],
    ["Wakefit Innovations Limited", "WAKEFIT", "WAKEFIT.NS", "2025-12-15"],
  ]),

  ...withSector("Fintech", [
    ["AvenuesAI Limited", "539807", "539807.BO", "2016-04-04"],
    ["Central Depository Services (India) Limited", "CDSL", "CDSL.NS", "2017-06-30"],
    ["Angel One Limited", "ANGELONE", "ANGELONE.NS", "2020-10-05"],
    ["One97 Communications Limited", "PAYTM", "PAYTM.NS", "2021-11-18"],
    ["Zaggle Prepaid Ocean Services Limited", "ZAGGLE", "ZAGGLE.NS", "2023-09-22"],
    ["Protean eGov Technologies Limited", "544021", "PROTEAN.NS", "2023-11-13"],
    ["BLS E-Services Limited", "BLSE", "BLSE.NS", "2024-02-06"],
    ["Go Digit General Insurance Limited", "GODIGIT", "GODIGIT.NS", "2024-05-23"],
    ["One MobiKwik Systems Limited", "MOBIKWIK", "MOBIKWIK.NS", "2024-12-18"],
    ["National Securities Depository Limited", "544467", "544467.BO", "2025-08-06"],
    ["Billionbrains Garage Ventures Limited", "GROWW", "GROWW.NS", "2025-11-12"],
    ["Pine Labs Limited", "PINELABS", "PINELABS.NS", "2025-11-14"],
    ["OnEMI Technology Solutions Limited", "KISSHT", "KISSHT.NS", "2026-05-08"],
  ]),

  ...withSector("B2B", [
    ["IndiaMART InterMESH Limited", "INDIAMART", "INDIAMART.NS", "2019-07-04"],
    ["Delhivery Limited", "DELHIVERY", "DELHIVERY.NS", "2022-05-24"],
    ["Avalon Technologies Limited", "AVALON", "AVALON.NS", "2023-04-18"],
    ["ideaForge Technology Limited", "IDEAFORGE", "IDEAFORGE.NS", "2023-07-07"],
    ["Cyient DLM Limited", "CYIENTDLM", "CYIENTDLM.NS", "2023-07-10"],
    ["TBO Tek Limited", "TBOTEK", "TBOTEK.NS", "2024-05-15"],
    ["Awfis Space Solutions Limited", "AWFIS", "AWFIS.NS", "2024-05-30"],
    ["Unicommerce eSolutions Limited", "UNIECOM", "UNIECOM.NS", "2024-08-13"],
    ["BlackBuck Limited", "BLACKBUCK", "BLACKBUCK.NS", "2024-11-22"],
    ["Smartworks Coworking Spaces Limited", "SMARTWORKS", "SMARTWORKS.NS", "2025-07-17"],
    ["IndiQube Spaces Limited", "INDIQUBE", "INDIQUBE.NS", "2025-07-30"],
    ["Seshaasai Technologies Limited", "STYL", "STYL.NS", "2025-09-30"],
    ["WeWork India Management Limited", "WEWORK", "WEWORK.NS", "2025-10-10"],
    ["Aequs Limited", "AEQUS", "AEQUS.NS", "2025-12-10"],
    ["Shadowfax Technologies Limited", "SHADOWFAX", "SHADOWFAX.NS", "2026-01-28"],
  ]),

  ...withSector("SaaS", [
    ["Quick Heal Technologies Limited", "QUICKHEAL", "QUICKHEAL.NS", "2016-02-18"],
    ["Affle 3i Limited", "AFFLE", "AFFLE.NS", "2019-08-08"],
    ["Route Mobile Limited", "ROUTE", "ROUTE.NS", "2020-09-21"],
    ["RateGain Travel Technologies Limited", "RATEGAIN", "RATEGAIN.NS", "2021-12-17"],
    ["C. E. Info Systems Limited", "MAPMYINDIA", "MAPMYINDIA.NS", "2021-12-21"],
    ["eMudhra Limited", "EMUDHRA", "EMUDHRA.NS", "2022-06-01"],
    ["Tracxn Technologies Limited", "TRACXN", "TRACXN.NS", "2022-10-20"],
    ["Capillary Technologies India Limited", "CAPILLARY", "CAPILLARY.NS", "2025-11-21"],
    ["Amagi Media Labs Limited", "AMAGI", "AMAGI.NS", "2026-01-21"],
    ["Fractal Analytics Limited", "FRACTAL", "FRACTAL.NS", "2026-02-16"],
  ]),

  ...withSector("Healthcare", [
    ["MedPlus Health Services Limited", "MEDPLUS", "MEDPLUS.NS", "2021-12-23"],
    ["Medi Assist Healthcare Services Limited", "MEDIASSIST", "MEDIASSIST.NS", "2024-01-23"],
    ["Entero Healthcare Solutions Limited", "ENTERO", "ENTERO.NS", "2024-02-16"],
    ["Inventurus Knowledge Solutions Limited", "IKS", "IKS.NS", "2024-12-19"],
    ["Nephrocare Health Services Limited", "NEPHROPLUS", "NEPHROPLUS.NS", "2025-12-17"],
  ]),

  ...withSector("Edtech", [
    ["Physicswallah Limited", "PWL", "PWL.NS", "2025-11-18"],
    ["Excelsoft Technologies Limited", "EXCELSOFT", "EXCELSOFT.NS", "2025-11-26"],
  ]),

  ...withSector("Gaming", [
    ["Nazara Technologies Limited", "NAZARA", "NAZARA.NS", "2021-03-30"],
  ]),

  ...withSector("Deep Tech", [
    ["Elin Electronics Limited", "ELIN", "ELIN.NS", "2022-12-30"],
    ["Netweb Technologies India Limited", "NETWEB", "NETWEB.NS", "2023-07-27"],
    ["Exicom Tele-Systems Limited", "EXICOM", "EXICOM.NS", "2024-03-05"],
    ["Unimech Aerospace and Manufacturing Limited", "UNIMECH", "UNIMECH.NS", "2024-12-31"],
    ["Aditya Infotech Limited", "CPPLUS", "CPPLUS.NS", "2025-08-05"],
    ["SEDEMAC Mechatronics Limited", "SEDEMAC", "SEDEMAC.NS", "2026-03-11"],
  ]),

];

export const INDEX_BASE_DATE = "2020-12-31";
export const INDEX_BASE_VALUE = 1000;
