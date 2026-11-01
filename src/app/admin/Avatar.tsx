import Image from "next/image";
import { avatarUrl, initialOf } from "@/lib/team/shared";

/** A teammate's profile picture, or their initial when they haven't added one. Decorative: the name is always next to it. */
export function Avatar({ person, size = 32 }: { person: { id: string; name: string; avatarKey?: string | null }; size?: number }) {
  const url = avatarUrl(person);
  return (
    <span className="st-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {url ? <Image src={url} alt="" width={size} height={size} unoptimized /> : initialOf(person.name)}
    </span>
  );
}
