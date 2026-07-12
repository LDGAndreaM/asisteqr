/** Ícono de marca: marco de escaneo con patrón QR y una insignia de verificación. */
export default function Logo({
  size = 32,
  color = "#fff",
  checkColor = "#fff",
  className,
}: {
  size?: number;
  color?: string;
  checkColor?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* marco de escaneo: 3 esquinas (la 4ta la ocupa la insignia de verificación) */}
      <path d="M4 34V12A8 8 0 0 1 12 4H34" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <path d="M66 4H88A8 8 0 0 1 96 12V34" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <path d="M4 66V88A8 8 0 0 0 12 96H34" stroke={color} strokeWidth="7" strokeLinecap="round" />

      {/* patrón buscador (arriba-izq, arriba-der, abajo-izq) */}
      <rect x="14" y="14" width="24" height="24" rx="6" stroke={color} strokeWidth="6" />
      <rect x="21.5" y="21.5" width="9" height="9" rx="2.5" stroke={color} strokeWidth="5.5" />
      <rect x="62" y="14" width="24" height="24" rx="6" stroke={color} strokeWidth="6" />
      <rect x="69.5" y="21.5" width="9" height="9" rx="2.5" stroke={color} strokeWidth="5.5" />
      <rect x="14" y="62" width="24" height="24" rx="6" stroke={color} strokeWidth="6" />
      <rect x="21.5" y="69.5" width="9" height="9" rx="2.5" stroke={color} strokeWidth="5.5" />

      {/* módulos de datos sueltos, esquina de la insignia */}
      <circle cx="58" cy="56" r="6" fill={color} />
      <circle cx="70" cy="52" r="5" fill={color} />

      {/* insignia de verificación */}
      <circle cx="76" cy="76" r="21" fill="none" stroke={color} strokeWidth="6.5" />
      <path
        d="M67 77l7 7 16-18"
        stroke={checkColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
