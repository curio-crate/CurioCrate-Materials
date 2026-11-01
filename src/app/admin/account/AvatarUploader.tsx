"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AVATAR_ACCEPT, AVATAR_MAX_MB } from "@/lib/team/shared";
import { Avatar } from "../Avatar";
import { useConfirm } from "../Confirm";

// Profile picture: shown next to your name in chat, the sidebar, Team and To-dos.
export function AvatarUploader({ me }: { me: { id: string; name: string; avatarKey: string | null } }) {
  const router = useRouter();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) return setMsg({ ok: false, text: `Use a picture under ${AVATAR_MAX_MB} MB.` });
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    setMsg(null);
    const body = new FormData();
    body.set("file", file);
    const r = await fetch("/api/admin/avatar", { method: "POST", body }).catch(() => null);
    const data = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!r?.ok) {
      setPreview(null);
      return setMsg({ ok: false, text: data?.error ?? "The picture didn't upload. Try again." });
    }
    setMsg({ ok: true, text: "Profile picture saved." });
    router.refresh();
  };

  const remove = async () => {
    if (!(await confirm({ title: "Remove your profile picture?", message: "Your initial is shown instead. You can add a new picture any time.", confirmLabel: "Remove" }))) return;
    setBusy(true);
    await fetch("/api/admin/avatar", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setPreview(null);
    setMsg({ ok: true, text: "Profile picture removed." });
    router.refresh();
  };

  return (
    <div className="st-card" style={{ maxWidth: 560, marginBottom: 16 }}>
      <h2 className="st-h2">Profile picture</h2>
      <div className="st-avatarEdit">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
          <img src={preview} alt="" className="st-avatarPreview" width={64} height={64} />
        ) : (
          <Avatar person={me} size={64} />
        )}
        <div className="stack" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm btn-solid" onClick={() => input.current?.click()} disabled={busy}>
              <Icon name="upload" size={15} /> {me.avatarKey ? "Change picture" : "Add a picture"}
            </button>
            {me.avatarKey && (
              <button type="button" className="btn btn-sm" onClick={remove} disabled={busy}>
                Remove
              </button>
            )}
          </div>
          <span className="hint">PNG, JPG or WebP, up to {AVATAR_MAX_MB} MB. Your teammates see it in chat and To-dos.</span>
          {msg && (
            <span className={msg.ok ? "hint" : "st-msgFail"} role={msg.ok ? "status" : "alert"}>
              {msg.text}
            </span>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept={AVATAR_ACCEPT} hidden onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} aria-label="Choose a profile picture" />
    </div>
  );
}
