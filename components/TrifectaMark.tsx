interface TrifectaMarkProps {
  className?: string;
  title?: string;
}

export function TrifectaMark({ className = "h-8 w-8", title }: TrifectaMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
    >
      {title && <title>{title}</title>}
      <path
        fill="#e35205"
        d="M24 4 46 26 36 36 24 24 12 36 2 26 24 4Zm0 11.3L10.5 28.8l1.8 1.8L24 18.9l11.7 11.7 1.8-1.8L24 15.3Zm0 8.7 12 12-12 12-12-12 4.3-4.3L24 39.4l7.7-7.7L24 24Z"
      />
    </svg>
  );
}
