import { loginUser, logoutUser, refreshTokens } from "./auth.api";
import { clearAccessToken, getAccessToken } from "../utils/tokenStore";

describe("auth.api", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  it("stores access token after successful login", async () => {
    const response = await loginUser({
      id_number: "2024-0001",
      password: "secret-password",
    });

    expect(response.user.idNumber).toBe("2024-0001");
    expect(getAccessToken()).toBe("test-access-token");
  });

  it("refreshes tokens and updates token store", async () => {
    const response = await refreshTokens();

    expect(response?.message).toBe("Token refreshed successfully");
    expect(getAccessToken()).toBe("refreshed-access-token");
  });

  it("clears access token on logout", async () => {
    await loginUser({ id_number: "2024-0001", password: "secret-password" });
    expect(getAccessToken()).toBe("test-access-token");

    await logoutUser();
    expect(getAccessToken()).toBeNull();
  });
});
