export async function sendOtpEmail(toEmail, otpCode, username) {
  const apiKey = process.env.RESEND_API_KEY;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0e0e17;color:#e8e6e0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6C5CE7,#a29bfe);padding:24px;text-align:center;">
        <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;color:#fff;margin-bottom:8px;">X</div>
        <h1 style="color:#fff;margin:0;font-size:20px;">XU Economy</h1>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#fff;margin:0 0 8px;">Xác nhận email</h2>
        <p style="color:#999;margin:0 0 24px;">Xin chào <strong style="color:#a29bfe;">${username}</strong>, đây là mã OTP của bạn:</p>
        <div style="background:#13131f;border:2px solid #6C5CE7;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#a29bfe;font-family:monospace;">${otpCode}</span>
        </div>
        <p style="color:#666;font-size:13px;margin:0;">Mã có hiệu lực trong <strong style="color:#999;">10 phút</strong>. Không chia sẻ mã này với ai.</p>
      </div>
      <div style="border-top:1px solid #1e1e2e;padding:16px 24px;text-align:center;">
        <p style="color:#444;font-size:12px;margin:0;">Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.</p>
      </div>
    </div>
  `;

  if (!apiKey) {
    console.log(`[DEV] OTP cho ${toEmail}: ${otpCode}`);
    return { dev: true, otp: otpCode };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'XU Economy <onboarding@resend.dev>',
      to: [toEmail],
      subject: `[XU Economy] Mã xác nhận: ${otpCode}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Gửi email thất bại');
  }

  return { sent: true };
}
