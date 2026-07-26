import Image from "next/image";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/TC3d.png"
      alt="Travail Collaboratif"
      width={size}
      height={size}
      priority
      className="shrink-0"
    />
  );
}
