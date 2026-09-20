import { describe, expect, it } from "vitest";
import { passwordChangeSchema } from "@/lib/password";

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
    expect(parse("old-password", "mzt1234").success).toBe(false);
  });

  it("requires a new and confirmed password", () => {
    expect(parse("same-password", "same-password").success).toBe(false);
    expect(parse("old-password", "new-password", "different").success).toBe(false);
  });

  it("accepts a valid password change", () => {
    expect(parse("old-password", "new-password").success).toBe(true);
  });
});
