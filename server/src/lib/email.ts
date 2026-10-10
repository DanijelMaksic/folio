const esc = (s: string) =>
   s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

type Mail = { to: string; subject: string; html: string };

async function sendEmail({ to, subject, html }: Mail) {
   // Locally, mail is sent to the server terminal
   if (process.env.MAIL_TRANSPORT === 'console') {
      const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      const text = html
         .replace(/<[^>]+>/g, ' ')
         .replace(/\s+/g, ' ')
         .trim();
      console.log(
         `\n[DEV EMAIL] to: ${to}\nsubject: ${subject}\n${text}\n${links.map((l) => `link: ${l}`).join('\n')}\n`,
      );
      return;
   }

   // Production
   const auth = Buffer.from(
      `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_API_SECRET}`,
   ).toString('base64');

   const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
         Authorization: `Basic ${auth}`,
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         Messages: [
            {
               From: {
                  Email: process.env.MAIL_FROM_EMAIL,
                  Name: process.env.MAIL_FROM_NAME ?? 'Folio',
               },
               To: [{ Email: to }],
               Subject: subject,
               HTMLPart: html,
            },
         ],
      }),
      signal: AbortSignal.timeout(10_000),
   });

   if (!res.ok) throw new Error(`Mailjet ${res.status}: ${await res.text()}`);
}

// Notifications must never fail the action that triggered them
async function sendQuietly(mail: Mail) {
   try {
      await sendEmail(mail);
   } catch (err) {
      console.error('Email failed:', err);
   }
}

// Verification + OTP throw, so signup/login surface a delivery failure
export const sendVerificationEmail = (to: string, url: string) =>
   sendEmail({
      to,
      subject: 'Verify your Folio account',
      html: `
      <p>Thanks for signing up. Click the button below to verify your email address.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;color:#111;text-decoration:none;border-radius:4px;border:1px solid #111">Verify email</a>
      <p>This link expires in 24 hours. If you didn't create an account, ignore this email.</p>`,
   });

export const sendOtpEmail = (to: string, otp: string) =>
   sendEmail({
      to,
      subject: 'Your Folio login code',
      html: `
      <p>Your login verification code is:</p>
      <h2 style="letter-spacing:0.25em;font-size:2em">${esc(otp)}</h2>
      <p>This code expires in 10 minutes. If you didn't try to log in, ignore this email.</p>`,
   });

export const sendApprovalEmail = ({
   to,
   username,
   documentId,
}: {
   to: string;
   username: string;
   documentId: string;
}) =>
   sendQuietly({
      to,
      subject: 'Your transcription has been approved',
      html: `
      <p>Hi ${esc(username)},</p>
      <p>Your transcription has been approved.</p>
      <p><a href="${process.env.CLIENT_URL}/documents/${documentId}">View it here</a></p>`,
   });

export const sendRejectionEmail = ({
   to,
   username,
   documentId,
   reason,
}: {
   to: string;
   username: string;
   documentId: string;
   reason: string;
}) =>
   sendQuietly({
      to,
      subject: 'Your transcription needs revision',
      html: `
      <p>Hi ${esc(username)},</p>
      <p>Your transcription has been rejected for the following reason:</p>
      <blockquote>${esc(reason)}</blockquote>
      <p>Please revise and resubmit.</p>
      <p><a href="${process.env.CLIENT_URL}/documents/${documentId}">View it here</a></p>`,
   });

export const sendRoleRequestApprovedEmail = (to: string, role: string) =>
   sendQuietly({
      to,
      subject: `You're now a ${role} on Folio`,
      html: `<p>Your request was approved. You now have <strong>${esc(role)}</strong> access.</p>
             <p>Sign out and back in if you don't see the change.</p>`,
   });

export const sendRoleRequestRejectedEmail = (to: string, reason?: string) =>
   sendQuietly({
      to,
      subject: 'Your Folio role request',
      html: `<p>Your request for a higher role wasn't approved this time.</p>
             ${reason ? `<p>Reason: ${esc(reason)}</p>` : ''}`,
   });
