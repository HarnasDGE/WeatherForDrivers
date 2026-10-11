interface IconProps {
  /** Material Symbols name - add new names to the ICONS list in BaseLayout.astro. */
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

/** Decorative icon (hidden from screen readers - label the surrounding control instead). */
export default function Icon({ name, filled = false, size, className }: IconProps) {
  return (
    <span
      className={className ? `icon ${className}` : 'icon'}
      data-filled={filled}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
