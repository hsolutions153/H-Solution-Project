export interface LoginResponse {
  success: boolean;
  message?: string;
}

export const mockLogin = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  // Giả lập gọi API
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (email === "admin@gmail.com" && password === "123456") {
    localStorage.setItem("isLoggedIn", "true");

    return {
      success: true,
    };
  }

  return {
    success: false,
    message: "Email hoặc mật khẩu không đúng.",
  };
};