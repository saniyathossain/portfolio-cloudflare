import { useStore } from "@nanostores/preact";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { postContact, readContactPayload } from "../lib/contactForm";
import { shellStore } from "../stores/ui";
import FadeError from "./FadeError";

interface FieldCopy {
  readonly label: string;
  readonly placeholder: string;
  /** Pre-rendered icon SVG. */
  readonly iconHtml: string;
}

interface UnderConstructionCopy {
  readonly enabled: boolean;
  readonly title: string;
  readonly message: string;
  readonly mailLabel: string;
}

interface ContactModalProps {
  readonly titlebarLabel: string;
  readonly closeAriaLabel: string;
  readonly heading: string;
  readonly fields: { readonly name: FieldCopy; readonly email: FieldCopy; readonly project: FieldCopy };
  readonly footerNote: string;
  readonly errorNote: string;
  readonly submitLabel: string;
  readonly submittingLabel: string;
  readonly success: { readonly heading: string; readonly message: string; readonly closeLabel: string };
  readonly honeypotLabel: string;
  readonly turnstileSiteKey: string;
  readonly turnstileScriptUrl: string;
  readonly contactEndpoint: string;
  readonly resetMs: number;
  readonly errorEnterMs: number;
  readonly errorLeaveMs: number;
  readonly underConstruction: UnderConstructionCopy;
  readonly email: string;
  readonly closeIconHtml: string;
  readonly mailIconHtml: string;
  readonly arrowIconHtml: string;
  readonly wrenchIconHtml: string;
}

declare global {
  interface Window {
    /** Cloudflare Turnstile widget API, present once its script has loaded. */
    turnstile?: { reset(): void };
  }
}

/** Appends the Turnstile script once, and only when a site key is configured (keeps the request off page load). */
function loadTurnstile(siteKey: string, scriptUrl: string): void {
  if (!siteKey || window.turnstile || document.querySelector(`script[src="${scriptUrl}"]`)) return;
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function resetTurnstile(): void {
  try {
    window.turnstile?.reset();
  } catch {
    /* widget not rendered */
  }
}

function Icon({ html }: { readonly html: string }) {
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}

function ModalField({
  copy,
  id,
  children,
}: {
  readonly copy: FieldCopy;
  readonly id: string;
  readonly children: JSX.Element;
}) {
  return (
    <div className="modal-field">
      <label htmlFor={id}>
        <Icon html={copy.iconHtml} />
        <span>{copy.label}</span>
      </label>
      {children}
    </div>
  );
}

/** Contact dialog: request form (POST /api/contact), under-construction panel, success state. */
export default function ContactModal(props: ContactModalProps) {
  const { modalOpen, modalMounted } = useStore(shellStore);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const { turnstileSiteKey, turnstileScriptUrl, resetMs } = props;
  const notice = props.underConstruction;

  // Opening resets the form state at once and lazy-loads Turnstile; closing clears it after the close animation.
  useEffect(() => {
    if (modalOpen) {
      setSuccess(false);
      setSubmitting(false);
      setFormError("");
      loadTurnstile(turnstileSiteKey, turnstileScriptUrl);
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      setSubmitting(false);
      setSuccess(false);
      setFormError("");
    }, resetMs);
    return () => {
      clearTimeout(timerId);
    };
  }, [modalOpen, turnstileSiteKey, turnstileScriptUrl, resetMs]);

  const submitForm = async (event: SubmitEvent) => {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget as HTMLFormElement;
    setSubmitting(true);
    setFormError("");
    const accepted = await postContact(props.contactEndpoint, readContactPayload(new FormData(form)));
    if (accepted) {
      setSuccess(true);
      form.reset();
      resetTurnstile();
    } else {
      setFormError(props.errorNote);
    }
    setSubmitting(false);
  };

  return (
    <div
      className={modalOpen ? "modal-backdrop is-open" : "modal-backdrop"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-action="close-modal-backdrop"
      inert={!modalOpen}
    >
      <div className="modal-panel">
        <div className="modal-titlebar">
          <button
            type="button"
            className="modal-close grid place-items-center rounded-full"
            data-action="close-modal"
            aria-label={props.closeAriaLabel}
          >
            <Icon html={props.closeIconHtml} />
          </button>
          <p className="modal-titlebar__label">{props.titlebarLabel}</p>
        </div>

        {modalMounted && (
          <div>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-accent-bright text-2xl">
                  ✓
                </div>
                <h2 className="text-2xl font-semibold">{props.success.heading}</h2>
                <p className="max-w-sm text-sm text-ink/60">{props.success.message}</p>
                <button type="button" className="pill-btn pill-btn-dark mt-2" data-action="close-modal">
                  {props.success.closeLabel}
                </button>
              </div>
            ) : (
              <div className={notice.enabled ? "modal-form-wrap is-uc" : "modal-form-wrap"}>
                <div className="mb-6 modal-header">
                  <h2 id="modal-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {props.heading}
                  </h2>
                </div>
                <form
                  className="flex flex-col gap-4 modal-form"
                  onSubmit={(event) => {
                    void submitForm(event);
                  }}
                  inert={notice.enabled}
                >
                  <ModalField copy={props.fields.name} id="f-name">
                    <input
                      id="f-name"
                      name="name"
                      type="text"
                      required
                      placeholder={props.fields.name.placeholder}
                      autoComplete="name"
                    />
                  </ModalField>
                  <ModalField copy={props.fields.email} id="f-email">
                    <input
                      id="f-email"
                      name="email"
                      type="email"
                      required
                      placeholder={props.fields.email.placeholder}
                      autoComplete="email"
                    />
                  </ModalField>
                  <ModalField copy={props.fields.project} id="f-project">
                    <textarea
                      id="f-project"
                      name="project"
                      rows={4}
                      required
                      placeholder={props.fields.project.placeholder}
                    />
                  </ModalField>
                  <div className="hp-field" aria-hidden="true">
                    <label htmlFor="f-company">{props.honeypotLabel}</label>
                    <input id="f-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
                  </div>
                  <div
                    className="cf-turnstile"
                    data-sitekey={turnstileSiteKey}
                    data-theme="light"
                    style={turnstileSiteKey ? undefined : { display: "none" }}
                  />
                  <FadeError
                    message={formError}
                    className="modal-error"
                    transitionPrefix="modal-error"
                    enterMs={props.errorEnterMs}
                    leaveMs={props.errorLeaveMs}
                  />
                  <div className="modal-footer-row mt-2">
                    <p className="text-xs text-ink/45">{props.footerNote}</p>
                    <button type="submit" className="pill-btn pill-btn-dark" disabled={submitting}>
                      <span>{submitting ? props.submittingLabel : props.submitLabel}</span>
                      <span className="pill-btn__icon" aria-hidden="true">
                        <span dangerouslySetInnerHTML={{ __html: props.arrowIconHtml }} />
                      </span>
                    </button>
                  </div>
                </form>

                {notice.enabled && (
                  <div className="uc-panel" role="status">
                    <span className="uc-panel__icon icon-chip icon-chip--md" aria-hidden="true">
                      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: props.wrenchIconHtml }} />
                    </span>
                    <h3 className="uc-panel__title">{notice.title}</h3>
                    <p className="uc-panel__msg">{notice.message}</p>
                    <a className="pill-btn pill-btn-dark uc-panel__cta" href={`mailto:${props.email}`}>
                      <span>{notice.mailLabel}</span>
                      <span className="pill-btn__icon" aria-hidden="true">
                        <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: props.mailIconHtml }} />
                      </span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
