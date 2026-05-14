#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOGOS_DIR="$ROOT_DIR/public/logos"
mkdir -p "$LOGOS_DIR"
cd "$LOGOS_DIR"

download() {
  local ticker=$1
  local domain=$2
  local http_code
  local tmp_file="${ticker}.tmp"
  http_code=$(curl -sL -o "$tmp_file" -w "%{http_code}" \
    "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64")
  local size
  size=$(wc -c < "$tmp_file")
  local mime
  mime=$(file -b --mime-type "$tmp_file")

  if [[ "$http_code" != "200" ]]; then
    rm -f "$tmp_file"
    echo "$ticker ($domain): skipped HTTP $http_code, ${mime}, ${size}b"
    return
  fi

  if [[ "$mime" != "image/png" && "$mime" != "image/jpeg" ]]; then
    rm -f "$tmp_file"
    echo "$ticker ($domain): skipped HTTP $http_code, ${mime}, ${size}b"
    return
  fi

  mv "$tmp_file" "${ticker}.png"
  echo "$ticker ($domain): HTTP $http_code, ${mime}, ${size}b"
}

download ETERNAL    zomato.com
download SWIGGY     swiggy.com
download POLICYBZR  policybazaar.com
download MEESHO     meesho.com
download NYKAA      nykaa.com
download URBANCO    urbancompany.com
download FIRSTCRY   firstcry.com
download TBOTEK     tbo.com
download PWL        pw.live
download INDIGOPNTS indigopaints.com
download GOCOLORS   gocolors.com
download SULA       sulawines.com
download WAKEFIT    wakefit.co
download BLACKBUCK  blackbuck.com
download OLAELEC    olaelectric.com
download BIKAJI     bikaji.com
download TRACXN     tracxn.com
download HONASA     mamaearth.in
download BLUESTONE  bluestone.com
download IXIGO      ixigo.com
download YATRA      yatra.com
download ATHERENERG atherenergy.com
download GROWW      groww.in
download PAYTM      paytm.com
download PINELABS   pinelabs.com
download ZAGGLE     zaggle.in
download MOBIKWIK   mobikwik.com
download KISSHT     kissht.com
download DELHIVERY  delhivery.com
download INDIAMART  indiamart.com
download AWFIS      awfis.com
download MEDIASSIST mediassist.in
download IDEAFORGE  ideaforge.in
download INDIQUBE   indiqube.com
download UNIECOM    unicommerce.com
download SHADOWFAX  shadowfax.in
download GODIGIT    godigit.com
download AADHARHFC  aadharhfc.com
download FIVESTAR   fivestarfinance.in
download HOMEFIRST  homfirst.com
download INDIASHLTR indiashelter.in
download NORTHARC   northernarc.com
download AYE        ayefin.com
download MAPMYINDIA mapmyindia.com
download FRACTAL    fractal.ai
download CAPILLARY  capillarytech.com
download AMAGI      amagi.com
download RATEGAIN   rategain.com
download LENSKART   lenskart.com
download NAUKRI     naukri.com
download NAZARA     nazara.com
download CARTRADE   cartrade.com
download SEDEMAC    sedemac.com

echo ""
echo "Done. $(ls *.png 2>/dev/null | wc -l) logos downloaded."
