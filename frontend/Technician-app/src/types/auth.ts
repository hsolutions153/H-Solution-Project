export interface LoginFormData {
  identity: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgotPasswordFormData {
  identity: string;
}

export interface VerifyOtpFormData {
  otp: string;
}

export interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}