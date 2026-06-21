import nodemailer from "nodemailer";

export interface RsvpNotificationData {
  name: string;
  email: string;
  phone_number: string;
  will_go: boolean;
}

export class EmailService {
  private static getTransporter() {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Se as credenciais não estiverem configuradas, retorna null para ativar o modo mock/log
    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Envia uma notificação de e-mail sobre um novo RSVP.
   * Se as credenciais SMTP não estiverem configuradas, faz log no console (modo Mock).
   *
   * @param data Dados do convidado respondendo ao convite
   */
  static async sendRsvpNotification(data: RsvpNotificationData): Promise<void> {
    const { name, email, phone_number, will_go } = data;
    const statusText = will_go ? "Confirmou" : "Recusou";

    const subject = `[Noivado] Novo RSVP: ${name} (${statusText})`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Novo RSVP Recebido!</h2>
        <p style="font-size: 16px;">Um convidado acabou de responder ao convite do noivado:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Nome:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">E-mail:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Telefone:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${phone_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Presença:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; background-color: ${will_go ? "#d4edda" : "#f8d7da"}; color: ${will_go ? "#155724" : "#721c24"};">
                ${will_go ? "Confirmado (Vou)" : "Não vai"}
              </span>
            </td>
          </tr>
        </table>
        <p style="margin-top: 25px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
          Este é um e-mail automático enviado pela Engagement Invite API.
        </p>
      </div>
    `;

    const from = process.env.SMTP_FROM;
    const to = process.env.SMTP_TO;

    const transporter = this.getTransporter();

    if (!transporter) {
      console.log("--------------------------------------------------");
      console.log(
        `[MOCK EMAIL] Credenciais SMTP não configuradas. Simulação de envio:`,
      );
      console.log(`De: ${from}`);
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`HTML:`);
      console.log(html);
      console.log("--------------------------------------------------");
      return;
    }

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(
        `[EMAIL] E-mail de notificação enviado com sucesso para ${to}. MessageId: ${info.messageId}`,
      );
    } catch (error: any) {
      console.error(
        `[EMAIL ERROR] Falha ao enviar e-mail de notificação para ${to}:`,
        error.message,
      );
      throw error;
    }
  }
}
