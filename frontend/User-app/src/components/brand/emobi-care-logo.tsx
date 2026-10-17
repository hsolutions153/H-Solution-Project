import { BrandLockup, BrandMark } from "@h-mobility/ui";

/** Customer-app aliases for the shared V-HCare mark. */
export function EMobiCareLogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <BrandMark size={size} className={className} />;
}

interface EMobiCareLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  tagline?: string;
  textVariant?: "light" | "dark";
}

export function EMobiCareBrand({ size = 32, className = "", showText = true, tagline, textVariant = "dark" }: EMobiCareLogoProps) {
  if (!showText) return <BrandMark size={size} className={className} />;
  return <BrandLockup size={size} product={tagline} tone={textVariant === "light" ? "light" : "dark"} className={className} />;
}
