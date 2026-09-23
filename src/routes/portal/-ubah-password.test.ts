import { describe, expect, it } from "vitest";
import { passwordChangeSchema, strongPasswordChangeSchema } from "@/lib/password";

function parse(currentPassword: string, password: string, confirmation = password) {
  return passwordChangeSchema.safeParse({
    current_password: currentPassword,
    password,
    password_confirmation: confirmation,
  });
}

describe("passwordChangeSchema", () => {
  it("requires at least eight characters", () => {
    expect(parse("old-password", "short").success).toBe(false);
  });

  it("rejects the temporary password exactly", () => {
    expect(parse("old-password", "mzt12345").success).toBe(false);
  });

  it("requires a new and confirmed password", () => {
    expect(parse("same-password", "same-password").success).toBe(false);
    expect(parse("old-password", "new-password", "different").success).toBe(false);
  });

  it("accepts a valid password change", () => {
    expect(parse("old-password", "new-password").success).toBe(true);
  });

  it("requires strong passwords for onboarding", () => {
    expect(
      strongPasswordChangeSchema.safeParse({
        current_password: "mzt12345",
        password: "new-password",
        password_confirmation: "new-password",
      }).success,
    ).toBe(false);
    expect(
      strongPasswordChangeSchema.safeParse({
        current_password: "mzt12345",
        password: "StrongPassword1!",
        password_confirmation: "StrongPassword1!",
      }).success,
    ).toBe(true);
  });
});
