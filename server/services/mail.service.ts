import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTokenEmail(
  email: string,
  token: string,
  purpose: "verify" | "reset",
) {
  const base = process.env.CLIENT_URL;
  if (!base) throw new Error("APP_URL is not set");

  const path = purpose === "verify" ? "/verify-email" : "/reset-password";
  const url = new URL(path, base);
  url.searchParams.set("token", token);

  const action =
    purpose === "verify" ? "Verify your email address" : "Reset your password";
  const expires = purpose === "verify" ? "24 hours" : "30 minutes";

  const { error } = await resend.emails.send({
    from: "1 Crew 1 Project <noreply@updates.1crew1project.co.za>",
    to: email,
    subject:
      purpose === "verify"
        ? "Verify your 1 Crew 1 Project account"
        : "Reset your 1 Crew 1 Project password",
    text: `${action} using this link:\n\n${url.toString()}\n\nThis link expires in ${expires} and can be used once. If you did not request this, ignore the message.`,
  });

  if (error) {
    throw new Error(`Resend error: ${error.name} - ${error.message}`);
  }
}
