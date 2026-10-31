import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { formatCode } from "@/lib/codes";
import { env } from "@/lib/env";
import { getOrderWithCodes } from "@/lib/orders";
import { THEME } from "@/styles/tokens";
import { PrintButton } from "./PrintButton";
import styles from "./print.module.css";

export const metadata = { title: "Code sheet" };

// Printable sheet of code cards (8 per Letter page) to cut out and place inside kit boxes.
export default async function PrintCodes(props: PageProps<"/admin/orders/[id]/print">) {
  const { id } = await props.params;
  const data = await getOrderWithCodes(id);
  if (!data) notFound();
  const cards = await Promise.all(
    data.codes
      .filter((c) => c.code.status === "active")
      .map(async (c) => {
        const pretty = formatCode(c.code.code);
        const url = `${env.appUrl()}/redeem?code=${pretty}`;
        const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: THEME.printInk, light: THEME.paper } });
        return { id: c.code.id, pretty, kit: c.kitName, svg };
      }),
  );
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <p className="muted">
          {cards.length} unredeemed code{cards.length === 1 ? "" : "s"} · {data.order.reference ?? data.order.source}
        </p>
        <PrintButton />
      </div>
      <ul className={styles.sheet} aria-label="Code cards">
        {cards.map((c) => (
          <li key={c.id} className={styles.card}>
            <div className={styles.qr} role="img" aria-label={`QR code that opens the redeem page for ${c.pretty}`} dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div className={styles.text}>
              <span className={styles.label}>Online kit code</span>
              <span className={styles.kit}>{c.kit}</span>
              <span className={styles.code}>{c.pretty}</span>
              <span className={styles.url}>Scan, or go to materials.curiocrate.org/redeem</span>
              <span className={styles.note}>One use. Unlocks the online kit for the teacher who redeems it.</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
