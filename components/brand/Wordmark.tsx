import { Mark } from "./Mark";

interface Props {
  size?: number;
  className?: string;
  tone?: "default" | "primary";
}

export function Wordmark({ size = 22, className, tone = "default" }: Props) {
  const color = tone === "primary" ? "var(--primary)" : "currentColor";
  return (
    <span
      className={"inline-flex items-center leading-none " + (className ?? "")}
      style={{ color, height: size }}
      aria-label="Kalendly"
    >
      <Mark size={size} />
      <span
        style={{
          fontWeight: 600,
          letterSpacing: "-0.04em",
          fontSize: Math.round(size * 0.86),
          lineHeight: 1,
          marginLeft: -Math.round(size * 0.16),
        }}
      >
        alendly
      </span>
    </span>
  );
}
