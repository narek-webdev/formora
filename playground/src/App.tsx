import React, { useMemo, useState } from "react";
import { useForm } from "../../src";

// --- Small UI helpers (no external deps) ------------------------------------

function Section(props: {
  title: string;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        background: "#fff",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 18 }}>
        {props.title}
      </h2>
      {props.note ? (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#f8fafc",
            border: "1px solid #eef2f7",
            color: "#334155",
            marginBottom: 12,
            lineHeight: 1.35,
          }}
        >
          {props.note}
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

function FieldRow(props: {
  label: string;
  description?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "start",
        padding: "10px 0",
        borderTop: "1px dashed #e5e7eb",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{props.label}</div>
        {props.description ? (
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
            {props.description}
          </div>
        ) : null}
        {props.children}
      </div>
      {props.right ? <div>{props.right}</div> : <div />}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        outline: "none",
        fontSize: 14,
        ...(props.style || {}),
      }}
    />
  );
}

function Btn(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "primary" | "neutral";
  }
) {
  const tone = props.tone ?? "neutral";
  return (
    <button
      {...props}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: tone === "primary" ? "1px solid #0ea5e9" : "1px solid #cbd5e1",
        background: tone === "primary" ? "#0ea5e9" : "#ffffff",
        color: tone === "primary" ? "#fff" : "#0f172a",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        ...(props.style || {}),
      }}
    />
  );
}

function Pill(props: {
  children: React.ReactNode;
  tone?: "good" | "warn" | "info";
}) {
  const tone = props.tone ?? "info";
  const map = {
    good: { bg: "#ecfdf5", bd: "#a7f3d0", fg: "#065f46" },
    warn: { bg: "#fff7ed", bd: "#fed7aa", fg: "#9a3412" },
    info: { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1e40af" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 999,
        border: `1px solid ${map.bd}`,
        background: map.bg,
        color: map.fg,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {props.children}
    </span>
  );
}

function MetaLine(props: {
  showError: boolean;
  error?: string;
  touched?: boolean;
  dirty?: boolean;
  validating?: boolean;
  modeLabel: string;
}) {
  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Pill tone={props.showError ? "warn" : "good"}>
        {props.showError ? "Error shown" : "No visible error"}
      </Pill>
      <Pill tone={props.touched ? "info" : "good"}>
        touched: {String(!!props.touched)}
      </Pill>
      <Pill tone={props.dirty ? "info" : "good"}>
        dirty: {String(!!props.dirty)}
      </Pill>
      <Pill tone={props.validating ? "warn" : "good"}>
        validating: {String(!!props.validating)}
      </Pill>
      <Pill tone="info">mode: {props.modeLabel}</Pill>
      {props.showError ? (
        <div style={{ color: "#b45309", fontWeight: 700 }}>• {props.error}</div>
      ) : null}
    </div>
  );
}

// --- Demo types --------------------------------------------------------------

type DemoValues = {
  email: string;
  password: string;
  confirmPassword: string;
  profile: {
    address: {
      street: string;
    };
  };
  items: { name: string; qty: number }[];
};

const initial: DemoValues = {
  email: "",
  password: "",
  confirmPassword: "",
  profile: { address: { street: "" } },
  items: [{ name: "Coffee", qty: 1 }],
};

// Fake async check. Treat "taken@formora.dev" as already used.
function fakeEmailCheck(email: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const ms = 450;
    setTimeout(() => {
      if (!email) return resolve(undefined);
      const normalized = email.trim().toLowerCase();
      if (normalized === "taken@formora.dev")
        return resolve("Email is already taken");
      if (normalized.endsWith("@example.com"))
        return resolve("Please use a real email domain");
      return resolve(undefined);
    }, ms);
  });
}

function DemoForm(props: {
  mode: "submit" | "change" | "blur";
  title: string;
  explanation: React.ReactNode;
}) {
  const [submitMsg, setSubmitMsg] = useState<string>("");

  const form = useForm<DemoValues>({
    initialValues: initial,
    validateOn: props.mode,
  });

  // Register rules (sync + async)
  const emailReg = form.register("email", {
    validate: (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
        return "Email must look like name@domain.com";
      return undefined;
    },
    validateAsync: async (v) => {
      const s = String(v ?? "").trim();
      return fakeEmailCheck(s);
    },
  });

  const passReg = form.register("password", {
    validate: (v) => {
      const s = String(v ?? "");
      if (!s) return "Password is required";
      if (s.length < 6) return "Password must be at least 6 characters";
      return undefined;
    },
  });

  const confirmReg = form.register("confirmPassword", {
    validate: (v: unknown, values: DemoValues) => {
      const s = String(v ?? "");
      if (!s) return "Please confirm password";
      if (s !== values.password) return "Passwords do not match";
      return undefined;
    },
  });

  const streetReg = form.register("profile.address.street", {
    validate: (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "Street is required";
      if (s.length < 3) return "Street must be at least 3 characters";
      return undefined;
    },
  });

  // A helper to render array row meta + input
  function ItemRow({ index }: { index: number }) {
    const namePath = `items.${index}.name` as const;
    const qtyPath = `items.${index}.qty` as const;

    const nameMeta = form.getFieldMeta(namePath);
    const qtyMeta = form.getFieldMeta(qtyPath);

    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          marginTop: 10,
          background: "#fcfcfd",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 800 }}>Item #{index}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn type="button" onClick={() => form.remove("items", index)}>
              remove
            </Btn>
            <Btn
              type="button"
              onClick={() => form.insert("items", index, { name: "", qty: 1 })}
            >
              insert here
            </Btn>
            <Btn
              type="button"
              onClick={() =>
                form.replace("items", index, {
                  name: "Replaced",
                  qty: 2,
                })
              }
            >
              replace
            </Btn>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px",
            gap: 12,
            marginTop: 10,
          }}
        >
          <div>
            <Input
              placeholder="Item name (required, min 2 chars)"
              {...form.register(namePath, {
                validate: (v) => {
                  const s = String(v ?? "").trim();
                  if (!s) return "Item name is required";
                  if (s.length < 2)
                    return "Item name must be at least 2 characters";
                  return undefined;
                },
              })}
            />
            <MetaLine
              modeLabel={props.mode}
              showError={!!nameMeta.showError}
              error={nameMeta.error}
              touched={nameMeta.isTouched}
              dirty={nameMeta.isDirty}
              validating={nameMeta.isValidating}
            />
          </div>
          <div>
            <Input
              type="number"
              min={0}
              placeholder="qty"
              {...form.register(qtyPath, {
                validate: (v) => {
                  const n = Number(v);
                  if (!Number.isFinite(n)) return "Quantity must be a number";
                  if (n <= 0) return "Quantity must be at least 1";
                  if (n > 10) return "Quantity must be ≤ 10";
                  return undefined;
                },
              })}
            />
            <MetaLine
              modeLabel={props.mode}
              showError={!!qtyMeta.showError}
              error={qtyMeta.error}
              touched={qtyMeta.isTouched}
              dirty={qtyMeta.isDirty}
              validating={qtyMeta.isValidating}
            />
          </div>
        </div>

        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
        >
          <Btn
            type="button"
            onClick={() => index > 0 && form.move("items", index, index - 1)}
          >
            move up
          </Btn>
          <Btn
            type="button"
            onClick={() =>
              form.move(
                "items",
                index,
                Math.min(index + 1, (form as any).values.items.length - 1)
              )
            }
          >
            move down
          </Btn>
          <Btn
            type="button"
            onClick={() => {
              const last = (form as any).values.items.length - 1;
              if (last >= 0) form.swap("items", index, last);
            }}
          >
            swap with last
          </Btn>
        </div>
      </div>
    );
  }

  const emailMeta = form.getFieldMeta("email");
  const passMeta = form.getFieldMeta("password");
  const confirmMeta = form.getFieldMeta("confirmPassword");
  const streetMeta = form.getFieldMeta("profile.address.street");

  const isValidatingAny = useMemo(() => {
    return (
      !!(form as any).isValidating ||
      !!emailMeta.isValidating ||
      !!passMeta.isValidating ||
      !!confirmMeta.isValidating ||
      !!streetMeta.isValidating
    );
  }, [
    emailMeta.isValidating,
    passMeta.isValidating,
    confirmMeta.isValidating,
    streetMeta.isValidating,
  ]);

  const onSubmit = (values: DemoValues) => {
    setSubmitMsg(
      `✅ Submitted with ${values.items.length} item(s). Email: ${
        values.email || "(empty)"
      }`
    );
  };

  return (
    <Section
      title={props.title}
      note={
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            What this demo proves
          </div>
          <div>{props.explanation}</div>
          <div
            style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <Pill tone="info">Try: type, blur, submit</Pill>
            <Pill tone={isValidatingAny ? "warn" : "good"}>
              async validating: {String(!!isValidatingAny)}
            </Pill>
            <Pill tone="info">Async email: try “taken@formora.dev”</Pill>
          </div>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitMsg("");
          const maybeHandleSubmit = (form as any).handleSubmit;
          if (typeof maybeHandleSubmit === "function") {
            return maybeHandleSubmit(onSubmit)();
          }
          const maybeSubmit = (form as any).submit;
          if (typeof maybeSubmit === "function") {
            return maybeSubmit(onSubmit);
          }
        }}
      >
        {/* Email */}
        <FieldRow
          label="Email (sync + async validation)"
          description={
            props.mode === "submit"
              ? "In submit mode, validation happens on submit. Visible errors use meta, not only submit."
              : props.mode === "change"
              ? "In change mode, validation runs on each keystroke."
              : "In blur mode, validation runs when leaving the input."
          }
        >
          <Input
            aria-label={`${props.mode}-email`}
            placeholder="name@domain.com"
            {...emailReg}
          />
          <MetaLine
            modeLabel={props.mode}
            showError={!!emailMeta.showError}
            error={emailMeta.error}
            touched={emailMeta.isTouched}
            dirty={emailMeta.isDirty}
            validating={emailMeta.isValidating}
          />
          <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
            Async rule: <code>taken@formora.dev</code> → “Email is already
            taken”
          </div>
        </FieldRow>

        {/* Password */}
        <FieldRow
          label="Password"
          description="Sync rules: required + min length 6."
        >
          <Input
            type="password"
            aria-label={`${props.mode}-password`}
            placeholder="••••••"
            {...passReg}
          />
          <MetaLine
            modeLabel={props.mode}
            showError={!!passMeta.showError}
            error={passMeta.error}
            touched={passMeta.isTouched}
            dirty={passMeta.isDirty}
            validating={passMeta.isValidating}
          />
        </FieldRow>

        {/* Confirm password */}
        <FieldRow
          label="Confirm password (cross-field validation)"
          description="Compares confirmPassword to password using (value, values)."
        >
          <Input
            type="password"
            aria-label={`${props.mode}-confirmPassword`}
            placeholder="••••••"
            {...confirmReg}
          />
          <MetaLine
            modeLabel={props.mode}
            showError={!!confirmMeta.showError}
            error={confirmMeta.error}
            touched={confirmMeta.isTouched}
            dirty={confirmMeta.isDirty}
            validating={confirmMeta.isValidating}
          />
        </FieldRow>

        {/* Nested field */}
        <FieldRow
          label="Street (nested object field)"
          description="Path: profile.address.street (tests deep object support)."
        >
          <Input
            aria-label={`${props.mode}-street`}
            placeholder="e.g., Komitas 12"
            {...streetReg}
          />
          <MetaLine
            modeLabel={props.mode}
            showError={!!streetMeta.showError}
            error={streetMeta.error}
            touched={streetMeta.isTouched}
            dirty={streetMeta.isDirty}
            validating={streetMeta.isValidating}
          />
        </FieldRow>

        {/* Field arrays */}
        <FieldRow
          label="Items (field array API)"
          description="Operations: append/remove/move/swap/insert/replace. Errors/touched/dirty should shift correctly."
          right={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn
                tone="primary"
                type="button"
                onClick={() =>
                  (form as any).append("items", { name: "", qty: 1 })
                }
              >
                append item
              </Btn>
              <Btn type="button" onClick={() => (form as any).reset()}>
                reset form
              </Btn>
              <Btn
                type="button"
                onClick={() => (form as any).resetField("email")}
              >
                resetField(email)
              </Btn>
            </div>
          }
        >
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
            Tip: create an error on item #0 then move it down — the error should
            travel with the item.
          </div>

          {((form as any).values.items || []).map((_: any, i: number) => (
            <ItemRow key={i} index={i} />
          ))}
        </FieldRow>

        <div
          style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}
        >
          <Btn tone="primary" type="submit">
            submit
          </Btn>
          <Btn
            type="button"
            onClick={() => {
              setSubmitMsg("(cleared)");
              (form as any).setErrors?.({});
              (form as any).setTouched?.({});
              (form as any).setDirty?.({});
            }}
          >
            clear meta (values stay)
          </Btn>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Messages</div>
          <div
            style={{
              color: submitMsg ? "#065f46" : "#64748b",
              fontWeight: 700,
            }}
          >
            {submitMsg ||
              "No submit message yet. (Errors are displayed using field meta — not only on submit.)"}
          </div>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>
            Debug snapshot (values/errors/meta)
          </summary>
          <pre
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              background: "#0b1220",
              color: "#e2e8f0",
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(
              {
                values: (form as any).values,
                errors: (form as any).errors,
                touched: (form as any).touched,
                dirty: (form as any).dirty,
                validating: (form as any).validating,
                hasSubmitted: (form as any).hasSubmitted,
                submitCount: (form as any).submitCount,
              },
              null,
              2
            )}
          </pre>
        </details>
      </form>
    </Section>
  );
}

export default function App() {
  const [tab, setTab] = useState<"submit" | "change" | "blur">("submit");

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 980,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui",
      }}
    >
      <h1 style={{ margin: 0, marginBottom: 8 }}>Formora Playground</h1>
      <div style={{ color: "#64748b", marginBottom: 14, lineHeight: 1.4 }}>
        This playground demonstrates <b>validateOn</b> modes,{" "}
        <b>nested fields</b>, <b>field arrays</b>, and <b>reset/resetField</b>.
        Errors are displayed using <b>field meta</b> (showError/error) — not
        only on submit.
      </div>

      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}
      >
        <Btn
          tone={tab === "submit" ? "primary" : "neutral"}
          onClick={() => setTab("submit")}
        >
          validateOn: submit
        </Btn>
        <Btn
          tone={tab === "change" ? "primary" : "neutral"}
          onClick={() => setTab("change")}
        >
          validateOn: change
        </Btn>
        <Btn
          tone={tab === "blur" ? "primary" : "neutral"}
          onClick={() => setTab("blur")}
        >
          validateOn: blur
        </Btn>
      </div>

      {tab === "submit" ? (
        <DemoForm
          mode="submit"
          title="Mode: submit"
          explanation={
            <>
              <div>
                In <b>submit</b> mode, fields validate when you submit. Visible
                errors still use meta so users aren’t spammed while typing.
              </div>
              <div style={{ marginTop: 6 }}>
                Try: leave fields empty → submit → errors appear. Then fix email
                and submit again.
              </div>
            </>
          }
        />
      ) : null}

      {tab === "change" ? (
        <DemoForm
          mode="change"
          title="Mode: change"
          explanation={
            <>
              <div>
                In <b>change</b> mode, validation runs on each keystroke. This
                is useful for live feedback.
              </div>
              <div style={{ marginTop: 6 }}>
                Try: type <code>taken@formora.dev</code> and watch async
                validating + error message.
              </div>
            </>
          }
        />
      ) : null}

      {tab === "blur" ? (
        <DemoForm
          mode="blur"
          title="Mode: blur"
          explanation={
            <>
              <div>
                In <b>blur</b> mode, fields validate when you leave the input.
                This is a great balance between noisy change-validation and
                submit-only validation.
              </div>
              <div style={{ marginTop: 6 }}>
                Try: focus email, type something invalid, then tab away → error
                shows.
              </div>
            </>
          }
        />
      ) : null}

      <Section
        title="Quick checklist before release"
        note={
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              What to verify manually
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                Each mode shows errors at the expected time
                (submit/change/blur).
              </li>
              <li>
                Async email validation toggles validating state and shows a
                readable message.
              </li>
              <li>
                Nested path <code>profile.address.street</code> validates and
                stores errors correctly.
              </li>
              <li>
                Field arrays: create an error in item #0 and then
                move/swap/insert/remove — meta should travel with the item.
              </li>
              <li>
                reset() clears meta by default; resetField("email") resets only
                that field.
              </li>
            </ul>
          </div>
        }
      >
        <div style={{ color: "#64748b" }}>
          If all bullets behave correctly, you’re ready to publish.
        </div>
      </Section>
    </div>
  );
}
