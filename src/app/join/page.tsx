import type { Metadata } from "next";
import styles from "@/app/(account)/account.module.css";
import { PageHead } from "@/components/ui/PageHead";

export const metadata: Metadata = { title: "Join your class" };

export default async function JoinPage(props: PageProps<"/join">) {
  const sp = await props.searchParams;
  return (
    <div className="container">
      <div className={styles.wrap}>
        <PageHead center size="h1" eyebrow="Students" title="Join your" accent="class." lead="Type the code your teacher gave you. No account, no name, no email." />
        <form action="/api/join" method="post" className={`card ${styles.panel} ${styles.form}`}>
          {sp.error && (
            <p className="alert alert-danger" role="alert">
              That code didn&apos;t work. Check it with your teacher.
            </p>
          )}
          <div className="field">
            <label htmlFor="class-code" className="label">
              Class code
            </label>
            <input id="class-code" name="code" className="input input-code" required minLength={6} maxLength={8} autoComplete="off" autoCapitalize="characters" placeholder="ABCDEF" />
          </div>
          <button type="submit" className="btn btn-solid btn-lg">
            Join class
          </button>
          <p className="hint">We give you a fun nickname like “Curious Otter” so your teacher can tell results apart. We never ask who you are.</p>
        </form>
      </div>
    </div>
  );
}
