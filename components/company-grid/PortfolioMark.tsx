import Image from "next/image";

/** Trifecta mark shown before a company name to flag a portfolio holding. */
export function PortfolioMark() {
  return (
    <Image
      src="/trifecta-mark.png"
      alt="Trifecta Capital Portfolio company"
      title="Trifecta Capital Portfolio company"
      width={16}
      height={16}
      className="nei-portfolio-mark"
    />
  );
}
