export async function sendPasswordResetCode(phone: string, code: string) {
  const webhookUrl = process.env.SMS_WEBHOOK_URL;
  if (!webhookUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Dịch vụ SMS chưa được cấu hình.");
    }
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SMS_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      phone,
      code,
      message: `Ma xac minh dat lai mat khau H-solutions cua ban la ${code}. Ma co hieu luc trong 10 phut.`,
    }),
  });

  if (!response.ok) {
    throw new Error("Không thể gửi mã xác minh qua SMS.");
  }
}
