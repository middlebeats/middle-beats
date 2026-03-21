import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

export async function sendWelcomeEmail(to: string, artistName: string, tempPassword: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Middle Beats Artist Portal',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#040e2b;color:#fff;padding:40px;border-radius:12px;">
        <img src="${APP_URL}/logo-white.png" style="height:32px;margin-bottom:32px;" alt="Middle Beats"/>
        <h1 style="font-size:24px;margin-bottom:16px;">Welcome, ${artistName} 🎵</h1>
        <p style="color:#8da8d8;line-height:1.6;margin-bottom:24px;">
          Your Middle Beats artist portal is ready. You can now log in to view your streams, revenue, and royalty statements.
        </p>
        <div style="background:#071535;border:1px solid #1a3080;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;color:#8da8d8;font-size:13px;">YOUR LOGIN DETAILS</p>
          <p style="margin:0 0 4px;"><strong>Email:</strong> ${to}</p>
          <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#0a1d47;padding:2px 8px;border-radius:4px;">${tempPassword}</code></p>
        </div>
        <a href="${APP_URL}/auth/login" style="display:inline-block;background:#1a55e8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Log In to Your Portal →
        </a>
        <p style="color:#5a7ab8;font-size:12px;margin-top:32px;">
          Please change your password after first login. If you have any questions, contact us at info@middle-beats.com
        </p>
      </div>
    `,
  })
}

export async function sendStatementEmail(
  to: string,
  artistName: string,
  period: string,
  totalRevenue: number,
  totalStreams: number,
  statementId: string
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your Middle Beats Statement — ${period}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#040e2b;color:#fff;padding:40px;border-radius:12px;">
        <img src="${APP_URL}/logo-white.png" style="height:32px;margin-bottom:32px;" alt="Middle Beats"/>
        <h1 style="font-size:24px;margin-bottom:8px;">Your ${period} Statement</h1>
        <p style="color:#8da8d8;line-height:1.6;margin-bottom:24px;">Hi ${artistName}, your royalty statement for ${period} is ready.</p>
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="flex:1;background:#071535;border:1px solid #1a3080;border-radius:8px;padding:20px;text-align:center;">
            <p style="margin:0 0 4px;color:#8da8d8;font-size:11px;letter-spacing:2px;">TOTAL REVENUE</p>
            <p style="margin:0;font-size:28px;font-weight:bold;color:#7dd3fc;">$${totalRevenue.toFixed(2)}</p>
          </div>
          <div style="flex:1;background:#071535;border:1px solid #1a3080;border-radius:8px;padding:20px;text-align:center;">
            <p style="margin:0 0 4px;color:#8da8d8;font-size:11px;letter-spacing:2px;">TOTAL STREAMS</p>
            <p style="margin:0;font-size:28px;font-weight:bold;">${totalStreams.toLocaleString()}</p>
          </div>
        </div>
        <a href="${APP_URL}/artist/statements/${statementId}" style="display:inline-block;background:#1a55e8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
          View Full Statement & Download PDF →
        </a>
        <p style="color:#5a7ab8;font-size:12px;margin-top:32px;">Middle Beats · middle-beats.com</p>
      </div>
    `,
  })
}
