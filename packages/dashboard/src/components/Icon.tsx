import { useTheme } from '../hooks/useTheme';

type IconName = 'sun' | 'moon' | 'close' | 'trash' | 'lightning' | 'play';

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = '' }: Props) {
  const { theme } = useTheme();
  
  // Use theme variable for fill color if not specified in className
  // However, the SVG paths use "stroke" or "fill" depending on the icon.
  // We'll set a default style to use current color for stroke/fill where appropriate.
  
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    style: { display: 'block' } // Remove inline-block spacing
  };

  if (name === 'sun') {
    return (
      <svg {...commonProps} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_sun)">
          <path d="M12 19.25C8 19.25 4.75 16 4.75 12C4.75 8 8 4.75 12 4.75C16 4.75 19.25 8 19.25 12C19.25 16 16 19.25 12 19.25ZM12 6.25C8.83 6.25 6.25 8.83 6.25 12C6.25 15.17 8.83 17.75 12 17.75C15.17 17.75 17.75 15.17 17.75 12C17.75 8.83 15.17 6.25 12 6.25Z" fill="currentColor"/>
          <path d="M12 22.96C11.45 22.96 11 22.55 11 22V21.92C11 21.37 11.45 20.92 12 20.92C12.55 20.92 13 21.37 13 21.92C13 22.47 12.55 22.96 12 22.96ZM19.14 20.14C18.88 20.14 18.63 20.04 18.43 19.85L18.3 19.72C17.91 19.33 17.91 18.7 18.3 18.31C18.69 17.92 19.32 17.92 19.71 18.31L19.84 18.44C20.23 18.83 20.23 19.46 19.84 19.85C19.65 20.04 19.4 20.14 19.14 20.14ZM4.86 20.14C4.6 20.14 4.35 20.04 4.15 19.85C3.76 19.46 3.76 18.83 4.15 18.44L4.28 18.31C4.67 17.92 5.3 17.92 5.69 18.31C6.08 18.7 6.08 19.33 5.69 19.72L5.56 19.85C5.37 20.04 5.11 20.14 4.86 20.14ZM22 13H21.92C21.37 13 20.92 12.55 20.92 12C20.92 11.45 21.37 11 21.92 11C22.47 11 22.96 11.45 22.96 12C22.96 12.55 22.55 13 22 13ZM2.08 13H2C1.45 13 1 12.55 1 12C1 11.45 1.45 11 2 11C2.55 11 3.04 11.45 3.04 12C3.04 12.55 2.63 13 2.08 13ZM19.01 5.99C18.75 5.99 18.5 5.89 18.3 5.7C17.91 5.31 17.91 4.68 18.3 4.29L18.43 4.16C18.82 3.77 19.45 3.77 19.84 4.16C20.23 4.55 20.23 5.18 19.84 5.57L19.71 5.7C19.52 5.89 19.27 5.99 19.01 5.99ZM4.99 5.99C4.73 5.99 4.48 5.89 4.28 5.7L4.15 5.56C3.76 5.17 3.76 4.54 4.15 4.15C4.54 3.76 5.17 3.76 5.56 4.15L5.69 4.28C6.08 4.67 6.08 5.3 5.69 5.69C5.5 5.89 5.24 5.99 4.99 5.99ZM12 3.04C11.45 3.04 11 2.63 11 2.08V2C11 1.45 11.45 1 12 1C12.55 1 13 1.45 13 2C13 2.55 12.55 3.04 12 3.04Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_sun"><rect width="24" height="24" fill="white"/></clipPath>
        </defs>
      </svg>
    );
  }

  if (name === 'moon') {
    return (
      <svg {...commonProps} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_moon)">
          <path d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19Z" fill="currentColor"/>
          <path d="M12 22.96C11.45 22.96 11 22.55 11 22V21.92C11 21.37 11.45 20.92 12 20.92C12.55 20.92 13 21.37 13 21.92C13 22.47 12.55 22.96 12 22.96ZM19.14 20.14C18.88 20.14 18.63 20.04 18.43 19.85L18.3 19.72C17.91 19.33 17.91 18.7 18.3 18.31C18.69 17.92 19.32 17.92 19.71 18.31L19.84 18.44C20.23 18.83 20.23 19.46 19.84 19.85C19.65 20.04 19.4 20.14 19.14 20.14ZM4.86 20.14C4.6 20.14 4.35 20.04 4.15 19.85C3.76 19.46 3.76 18.83 4.15 18.44L4.28 18.31C4.67 17.92 5.3 17.92 5.69 18.31C6.08 18.7 6.08 19.33 5.69 19.72L5.56 19.85C5.37 20.04 5.11 20.14 4.86 20.14ZM22 13H21.92C21.37 13 20.92 12.55 20.92 12C20.92 11.45 21.37 11 21.92 11C22.47 11 22.96 11.45 22.96 12C22.96 12.55 22.55 13 22 13ZM2.08 13H2C1.45 13 1 12.55 1 12C1 11.45 1.45 11 2 11C2.55 11 3.04 11.45 3.04 12C3.04 12.55 2.63 13 2.08 13ZM19.01 5.99C18.75 5.99 18.5 5.89 18.3 5.7C17.91 5.31 17.91 4.68 18.3 4.29L18.43 4.16C18.82 3.77 19.45 3.77 19.84 4.16C20.23 4.55 20.23 5.18 19.84 5.57L19.71 5.7C19.52 5.89 19.27 5.99 19.01 5.99ZM4.99 5.99C4.73 5.99 4.48 5.89 4.28 5.7L4.15 5.56C3.76 5.17 3.76 4.54 4.15 4.15C4.54 3.76 5.17 3.76 5.56 4.15L5.69 4.28C6.08 4.67 6.08 5.3 5.69 5.69C5.5 5.89 5.24 5.99 4.99 5.99ZM12 3.04C11.45 3.04 11 2.63 11 2.08V2C11 1.45 11.45 1 12 1C12.55 1 13 1.45 13 2C13 2.55 12.55 3.04 12 3.04Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_moon"><rect width="24" height="24" fill="white"/></clipPath>
        </defs>
      </svg>
    );
  }

  if (name === 'close') {
    return (
      <svg {...commonProps} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_close)">
          <path d="M13.9902 10.0099L14.8302 9.16992" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.16992 14.8301L11.9199 12.0801" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14.8299 14.8299L9.16992 9.16992" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_close"><rect width="24" height="24" fill="white"/></clipPath>
        </defs>
      </svg>
    );
  }

  if (name === 'trash') {
    return (
      <svg {...commonProps} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_trash)">
          <path d="M21 5.98047C17.67 5.65047 14.32 5.48047 10.98 5.48047C9 5.48047 7.02 5.58047 5.04 5.78047L3 5.98047" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 4.97L8.72 3.66C8.88 2.71 9 2 10.69 2H13.31C15 2 15.13 2.75 15.28 3.67L15.5 4.97" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.2099 22.0006H8.7899C5.9999 22.0006 5.9099 20.7806 5.7999 19.2106L5.1499 9.14062" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.8502 9.14062L18.2002 19.2106" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3301 16.5H13.6601" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.8198 12.5H14.4998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 12.5H10.33" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_trash"><rect width="24" height="24" fill="white"/></clipPath>
        </defs>
      </svg>
    );
  }

  if (name === 'lightning') {
    return (
      <svg {...commonProps} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_lightning)">
          <path d="M14.82 7.02087V3.52087C14.82 1.84087 13.91 1.50087 12.8 2.76087L5.23 11.3609C4.3 12.4109 4.69 13.2809 6.1 13.2809H9.19V20.4809C9.19 22.1609 10.1 22.5009 11.21 21.2409L18.78 12.6409C19.71 11.5909 19.32 10.7209 17.91 10.7209H14.82" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_lightning"><rect width="24" height="24" fill="white"/></clipPath>
        </defs>
      </svg>
    );
  }

  if (name === 'play') {
    return (
      <svg {...commonProps} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_play)">
          <path d="M17.13 7.98038C20.96 10.1904 20.96 13.8104 17.13 16.0204L14.04 17.8004L10.95 19.5804C7.13 21.7904 4 19.9804 4 15.5604V12.0004V8.44038C4 4.02038 7.13 2.21038 10.96 4.42038L13.21 5.72038" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_play"><rect width="24" height="24" fill="white"/></clipPath>
        </defs>
      </svg>
    );
  }

  return null;
}
