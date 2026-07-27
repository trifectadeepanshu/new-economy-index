import Image from "next/image";

/** Trifecta mark shown before a company name to flag a portfolio holding. */
export function PortfolioMark() {
  return (
    <Image
      src="/trifecta-mark.png"
      alt="Trifecta Capital portfolio company"
      title="Trifecta Capital portfolio company"
      width={16}
      height={16}
      className="nei-portfolio-mark"
    />
  );
}
