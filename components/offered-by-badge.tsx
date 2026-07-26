import Image from "next/image";

export function OfferedByBadge() {
  return (
    <a
      href="https://www.jas-dw.be/"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 transition hover:scale-105"
    >
      <Image
        src="/JAS-DW.png"
        alt="JAS Digital Works"
        width={500}
        height={500}
        className="h-[60px] w-[60px] object-contain"
      />
    </a>
  );
}
