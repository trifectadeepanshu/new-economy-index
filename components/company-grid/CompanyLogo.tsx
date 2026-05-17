import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { displayCompanyName } from "@/components/company-grid/format";
import { LOGO_ASSETS } from "@/components/company-grid/logoAssets";

function tickerHue(ticker: string) {
  let hue = 0;
  for (let index = 0; index < ticker.length; index += 1) {
    hue = (hue * 31 + ticker.charCodeAt(index)) % 360;
  }
  return hue;
}

function initialsFor(name: string) {
  return displayCompanyName(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function CompanyLogo({
  ticker,
  name,
  size = 40,
}: {
  ticker: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const logo = LOGO_ASSETS[ticker];
  const wideLogo = logo ? logo.width / logo.height > 1.8 : false;
  const imageMax = size * (wideLogo ? 0.84 : 0.7);
  const fallbackSize = size * 0.68;
  const style = {
    "--logo-size": `${size}px`,
    "--logo-radius": `${Math.max(8, Math.round(size * 0.25))}px`,
    "--logo-image-max": `${imageMax}px`,
    "--fallback-size": `${fallbackSize}px`,
    "--fallback-radius": `${Math.max(6, Math.round(size * 0.18))}px`,
    "--fallback-hue": tickerHue(ticker),
    "--fallback-font-size": `${Math.max(10, Math.round(size * 0.31))}px`,
  } as CSSProperties;

  return (
    <div className="nei-company-logo-tile" style={style}>
      {logo && !failed ? (
        <Image
          src={`/logos/${ticker}.png`}
          alt=""
          width={logo.width}
          height={logo.height}
          sizes={`${size}px`}
          className="nei-company-logo-image"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <span className="nei-company-logo-fallback">{initialsFor(name)}</span>
      )}
    </div>
  );
}
