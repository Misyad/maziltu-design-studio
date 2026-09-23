import { z } from "zod";

export const DEFAULT_MEMBER_PASSWORD = "mzt12345";

export const strongPasswordSchema = z
  .string()
  .min(12, "Password minimal 12 karakter")
  .regex(/[a-z]/, "Password wajib memiliki huruf kecil")
  .regex(/[A-Z]/, "Password wajib memiliki huruf besar")
  .regex(/[0-9]/, "Password wajib memiliki angka")
  .regex(/[^A-Za-z0-9]/, "Password wajib memiliki simbol");

function passwordChangeSchemaFor(password: z.ZodType<string>) {
  return z
    .object({
      current_password: z.string().min(1, "Password lama wajib diisi"),
      password: password.refine(
        (value) => value !== DEFAULT_MEMBER_PASSWORD,
        `Password baru tidak boleh menggunakan ${DEFAULT_MEMBER_PASSWORD}`,
      ),
      password_confirmation: z.string().min(1, "Konfirmasi password wajib diisi"),
    })
    .refine((data) => data.password !== data.current_password, {
      path: ["password"],
      message: "Password baru harus berbeda dari password lama",
    })
    .refine((data) => data.password === data.password_confirmation, {
      path: ["password_confirmation"],
      message: "Konfirmasi password tidak cocok",
    });
}

export const passwordChangeSchema = passwordChangeSchemaFor(
  z.string().min(8, "Password minimal 8 karakter"),
);
export const strongPasswordChangeSchema = passwordChangeSchemaFor(strongPasswordSchema);

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
