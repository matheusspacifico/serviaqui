export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Informe seu nome.";
  if (name.length < 2) return "O nome precisa ter pelo menos 2 caracteres.";
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Informe seu e-mail.";
  if (!EMAIL_PATTERN.test(email)) {
    return "Digite um e-mail válido, como nome@exemplo.com.";
  }
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return "Informe uma senha.";
  if (value.length < PASSWORD_MIN) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  }
  if (value.length > PASSWORD_MAX) {
    return `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`;
  }
  return null;
}

export function validateCurrentPassword(value: string): string | null {
  if (!value) return "Informe sua senha.";
  return null;
}

export const PASSWORD_HINT = `Mínimo de ${PASSWORD_MIN} caracteres.`;
