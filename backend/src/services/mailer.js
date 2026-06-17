import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'MT Economy <noreply@xueconomy.vn>';

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendMail({ to, subject, html }) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[Mailer] SMTP chưa cấu hình — bỏ qua email tới ${to}: ${subject}`);
    return { skipped: true };
  }
  try {
    return await transport.sendMail({ from: SMTP_FROM, to, subject, html });
  } catch (err) {
    console.error('[Mailer] Gửi email thất bại:', err.message);
    return { error: err.message };
  }
}

export async function sendWithdrawalApproved({ email, username, amountVnd, bankTransferRef }) {
  return sendMail({
    to: email,
    subject: '✅ Yêu cầu rút tiền đã được duyệt - MT Economy',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0e0e17;color:#ccc;border-radius:12px;border:1px solid #1e1e2e">
        <h2 style="color:#6fcf97;margin-top:0">✅ Yêu cầu rút tiền đã được duyệt</h2>
        <p>Xin chào <strong style="color:#fff">${username}</strong>,</p>
        <p>Yêu cầu rút tiền của bạn đã được duyệt và chuyển khoản thành công.</p>
        <div style="background:#13131f;border:1px solid #2e2e44;border-radius:8px;padding:16px;margin:16px 0">
          <div style="margin-bottom:8px">
            <span style="color:#888">Số tiền nhận:</span>
            <strong style="color:#6fcf97;margin-left:8px">${Number(amountVnd).toLocaleString('vi-VN')}đ</strong>
          </div>
          ${bankTransferRef ? `
          <div>
            <span style="color:#888">Mã giao dịch ngân hàng:</span>
            <code style="color:#74b9ff;margin-left:8px;background:#0e1e2a;padding:2px 8px;border-radius:4px">${bankTransferRef}</code>
          </div>` : ''}
        </div>
        <p style="color:#666;font-size:13px">Tiền có thể mất 1–3 ngày làm việc để vào tài khoản tùy ngân hàng.</p>
        <p style="color:#333;font-size:12px;margin-bottom:0">— MT Economy</p>
      </div>
    `,
  });
}

export async function sendWithdrawalRejected({ email, username, amountXu, reason }) {
  return sendMail({
    to: email,
    subject: '❌ Yêu cầu rút tiền bị từ chối - MT Economy',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0e0e17;color:#ccc;border-radius:12px;border:1px solid #1e1e2e">
        <h2 style="color:#ff6b6b;margin-top:0">❌ Yêu cầu rút tiền bị từ chối</h2>
        <p>Xin chào <strong style="color:#fff">${username}</strong>,</p>
        <p>Yêu cầu rút tiền của bạn đã bị từ chối. MT đã được hoàn về ví của bạn.</p>
        <div style="background:#13131f;border:1px solid #2e2e44;border-radius:8px;padding:16px;margin:16px 0">
          <div style="margin-bottom:8px">
            <span style="color:#888">MT hoàn về:</span>
            <strong style="color:#fd79a8;margin-left:8px">${Number(amountXu).toLocaleString('vi-VN')} MT</strong>
          </div>
          <div>
            <span style="color:#888">Lý do:</span>
            <span style="color:#ff6b6b;margin-left:8px">${reason}</span>
          </div>
        </div>
        <p style="color:#666;font-size:13px">Nếu bạn có thắc mắc, vui lòng liên hệ hỗ trợ.</p>
        <p style="color:#333;font-size:12px;margin-bottom:0">— MT Economy</p>
      </div>
    `,
  });
}
