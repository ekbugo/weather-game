const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send a password reset email with a link containing the reset token.
 */
async function sendPasswordResetEmail(to, resetToken, lang = 'es') {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const subjects = {
    en: 'Password Reset - Huracán Info Weather Challenge',
    es: 'Restablecer Contraseña - Huracán Info Weather Challenge'
  };

  const html = lang === 'es'
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #e97451;">Restablecer Contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el botón para crear una nueva contraseña:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #e97451; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Restablecer Contraseña
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.
        </p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #e97451;">Reset Your Password</h2>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #e97451; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Reset Password
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: subjects[lang] || subjects.es,
    html
  });
}

module.exports = { sendPasswordResetEmail };
