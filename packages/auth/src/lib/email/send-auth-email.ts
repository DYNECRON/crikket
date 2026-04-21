import { env } from "@crikket/env/server"
import { render } from "@react-email/render"
import nodemailer, { type Transporter } from "nodemailer"
import type { ReactElement } from "react"
import { Resend } from "resend"

type SendAuthEmailInput = {
  to: string
  subject: string
  text: string
  react: ReactElement
}

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

let smtpTransport: Transporter | null = null
if (env.SMTP_HOST) {
  const port = env.SMTP_PORT ?? 587
  const secure = env.SMTP_SECURE ?? port === 465
  smtpTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  })
}

const fromName = env.SMTP_FROM_NAME ?? "Crikket"
const smtpFromEmail = env.SMTP_FROM_EMAIL ?? env.SMTP_USER
const resendFromEmail = env.RESEND_FROM_EMAIL

export const sendAuthEmail = async ({
  to,
  subject,
  text,
  react,
}: SendAuthEmailInput): Promise<void> => {
  const html = await render(react)

  if (smtpTransport) {
    if (!smtpFromEmail) {
      throw new Error(
        "Missing SMTP_FROM_EMAIL (or SMTP_USER). Set it in apps/server/.env."
      )
    }

    await smtpTransport.sendMail({
      from: `${fromName} <${smtpFromEmail}>`,
      to,
      subject,
      html,
      text,
    })
    return
  }

  if (!resendClient) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "Missing email configuration. Set SMTP_HOST or RESEND_API_KEY in apps/server/.env."
      )
    }

    console.warn(
      `[email] No email transport configured. Skipping email delivery for ${to}.`
    )

    return
  }

  if (!resendFromEmail) {
    throw new Error(
      "Missing RESEND_FROM_EMAIL. Set RESEND_FROM_EMAIL in apps/server/.env."
    )
  }

  const { error } = await resendClient.emails.send({
    from: `${fromName} <${resendFromEmail}>`,
    to,
    subject,
    html,
    text,
  })

  if (error) {
    throw new Error(`Failed to send auth email: ${error.message}`)
  }
}
