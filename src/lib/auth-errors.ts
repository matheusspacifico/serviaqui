import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth-validation";

type AuthError = { code?: string; status?: number; message?: string };

const EMAIL_TAKEN_CODES = [
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  "USER_ALREADY_EXISTS",
];

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_EMAIL: "Digite um e-mail válido, como nome@exemplo.com.",
  PASSWORD_TOO_SHORT: `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`,
  PASSWORD_TOO_LONG: `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`,
  INVALID_TOKEN: "Link inválido ou expirado. Solicite um novo.",
};

export function isEmailTaken(error: AuthError): boolean {
  return !!error.code && EMAIL_TAKEN_CODES.includes(error.code);
}

export function authErrorMessage(error: AuthError, fallback: string): string {
  if (isEmailTaken(error)) return "Este e-mail já está cadastrado.";
  if (error.code && Object.hasOwn(MESSAGES, error.code)) {
    return MESSAGES[error.code];
  }
  if (error.status === 429) {
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  }
  return fallback;
}
