import Link from "next/link";

export function PlanCta({ planId, signedIn, hasSchool }: { planId: string; signedIn: boolean; hasSchool: boolean }) {
  if (!signedIn) return <Link href="/signin?next=/plans" className="btn btn-outline btn-block">Sign in to subscribe</Link>;
  if (!hasSchool) return <Link href="/onboarding?next=/plans" className="btn btn-outline btn-block">Choose your school</Link>;
  return (
    <form action="/api/subscribe" method="post">
      <input type="hidden" name="plan" value={planId} />
      <button className="btn btn-solid btn-block">Subscribe</button>
    </form>
  );
}
