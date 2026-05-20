import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LoginForm from "./LoginForm";

describe("LoginForm", () => {
  it("submits credentials and default remember state", async () => {
    const onLogin = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginForm onLogin={onLogin} />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Student ID Number"), "2024-0001");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith({
        id: "2024-0001",
        password: "secret-password",
        rememberMe: false,
      });
    });
  });
});
