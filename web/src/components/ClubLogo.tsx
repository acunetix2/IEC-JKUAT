type ClubLogoProps = {
  className?: string;
  alt?: string;
};

export default function ClubLogo({ className = '', alt = 'IEC JKUAT club logo' }: ClubLogoProps) {
  return (
    <img
      className={className}
      src="/uploads/iec-mark.png"
      alt={alt}
      draggable="false"
      loading="eager"
    />
  );
}
