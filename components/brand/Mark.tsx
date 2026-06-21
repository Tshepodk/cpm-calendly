interface Props {
  size?: number;
  className?: string;
}

export function Mark({ size = 16, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* left vertical bar */}
      <rect x="4.5" y="3.5" width="3" height="17" rx="0.5" />
      {/* upper arm: from mid-bar up-right to top-right */}
      <path d="M7.5 12 L18.5 3.5 L20.5 5.2 L9.5 13.5 Z" />
      {/* lower arm: from mid-bar down-right to bottom-right */}
      <path d="M7.5 11 L9.5 11 L20.5 19.3 L18.5 21 Z" />
    </svg>
  );
}
