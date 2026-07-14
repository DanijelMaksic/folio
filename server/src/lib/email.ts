import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Folio <onboarding@resend.dev>';

export const sendVerificationEmail = async (to: string, url: string) => {
   await resend.emails.send({
      from: FROM,
      to,
      subject: 'Verify your Folio account',
      html: `
      <p>Thanks for signing up. Click the button below to verify your email address.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0000;color:#111;text-decoration:none;border-radius:4px">
         Verify email
      </a>
      <p>This link expires in 24 hours. If you didn't create an account, ignore this email</p>
      `,
   });
};
