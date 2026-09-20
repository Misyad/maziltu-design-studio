import { z } from "zod";

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, "Password lama wajib diisi"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .refine((value) => value !== "mzt1234", "Password baru tidak boleh menggunakan mzt1234"),
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

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
