import { getCompanyAdmin, MIN_PASSWORD, usesDevPassword } from "@/lib/auth/admin";
import { ROLE_BLURB, ROLE_LABEL } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/viewer";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";
import { changeOwnPasswordAction } from "../team/actions";
import { AvatarUploader } from "./AvatarUploader";

export const metadata = { title: "My account" };

export default async function MyAccount(props: PageProps<"/admin/account">) {
  const actor = await requireAdmin();
  const sp = await props.searchParams;
  const [me, devPassword] = await Promise.all([getCompanyAdmin(), usesDevPassword(actor.adminId)]);
  return (
    <>
      <Notice sp={sp} />
      <StudioHead title="My account" sub={`Signed in as ${me?.username}. Every change you make in Studio is recorded in the audit log.`} />
      {devPassword && (
        <p className="alert alert-warning" role="alert" style={{ marginBottom: 20 }}>
          This account still uses the development password, which is written in the test code. Change it below.
        </p>
      )}
      <AvatarUploader me={{ id: actor.adminId, name: me?.name ?? actor.email, avatarKey: me?.avatarKey ?? null }} />
      <div className="st-card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <p className="st-h2">Your role</p>
        <p className="st-sub" style={{ marginTop: 8 }}>
          <span className="st-pill" style={{ marginRight: 8 }}>
            {ROLE_LABEL[actor.role]}
          </span>
          {ROLE_BLURB[actor.role]}
        </p>
      </div>
      <form action={changeOwnPasswordAction} className="st-card stack" style={{ maxWidth: 560, gap: 14 }} aria-labelledby="pw-h">
        <h2 id="pw-h" className="st-h2">
          Change my password
        </h2>
        <div className="field">
          <label className="label" htmlFor="cur-pw">
            Current password
          </label>
          <input id="cur-pw" name="current" type="password" className="input" autoComplete="current-password" required />
        </div>
        <div className="st-fields">
          <div className="field">
            <label className="label" htmlFor="next-pw">
              New password
            </label>
            <input id="next-pw" name="next" type="password" className="input" minLength={MIN_PASSWORD} autoComplete="new-password" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="confirm-pw">
              Repeat new password
            </label>
            <input id="confirm-pw" name="confirm" type="password" className="input" minLength={MIN_PASSWORD} autoComplete="new-password" required />
          </div>
        </div>
        <p className="hint">At least {MIN_PASSWORD} characters. Your other sessions are signed out when it changes.</p>
        <div>
          <button className="btn btn-solid">Change password</button>
        </div>
      </form>
    </>
  );
}
