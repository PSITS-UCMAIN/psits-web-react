import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router";
import logo from "@/assets/logo_forms_100x100.png";
import {
  LOGIN_ID_MAX_LENGTH,
  LOGIN_ID_MESSAGE,
  validateId,
} from "@/utils/studentId";

const formSchema = z.object({
  // Admins sign in through this same form as `<8 digits>-admin`, so the login
  // pattern is the one that allows a suffix — not the strict 8-digit rule.
  id: z
    .string()
    .trim()
    .refine((val) => validateId(val, { mode: "login" }).valid, {
      message: LOGIN_ID_MESSAGE,
    }),
  password: z.string(),
  rememberMe: z.boolean(),
});

export type LoginCredentials = z.infer<typeof formSchema>;

export interface LoginFormProps {
  onLogin?: (values: LoginCredentials) => void;
  isSubmitting?: boolean;
}

export default function LoginForm({ onLogin, isSubmitting }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      id: "",
      password: "",
      rememberMe: false,
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }: { value: LoginCredentials }) =>
      onLogin && onLogin(value),
  });

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <Card className="w-full border-none shadow-none sm:max-w-[400px]">
        <CardHeader className="mb-[12px] flex flex-col items-center space-y-2 text-center">
          {/* Logo Placeholder */}
          <div className="mb-4 flex h-18 w-18 items-center justify-center overflow-hidden rounded-full bg-slate-100">
            <img src={logo} alt="Logo" className="h-full w-full object-cover" />
          </div>

          <CardTitle className="text-4xl font-semibold tracking-tight text-gray-900">
            Welcome back
          </CardTitle>
          <CardDescription className="text-base text-gray-500">
            Welcome back! Please enter your details.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-0">
          <form
            id="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <FieldGroup>
              {/* Student ID Field */}
              <form.Field
                name="id"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="space-y-0">
                      <div className="relative">
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          autoComplete="username"
                          maxLength={LOGIN_ID_MAX_LENGTH}
                          // No inputMode="numeric": admin IDs end in "-admin",
                          // which a numeric keypad cannot type.
                          // IMPORTANT: this is purposedly empty. placeholder must be a space for CSS :placeholder-shown to work
                          placeholder=" "
                          className="peer h-12 rounded-xl border-gray-200 bg-transparent px-3 text-gray-900 placeholder-transparent focus:border-sky-500 focus:outline-none focus-visible:border-sky-500 focus-visible:ring-0"
                        />
                        {/* Floating Label */}
                        <label
                          htmlFor={field.name}
                          className="pointer-events-none absolute top-0 left-3 -translate-y-1/2 cursor-text bg-white px-1 text-xs text-sky-500 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-sky-500"
                        >
                          Student ID Number
                        </label>
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              {/* Password Field */}
              <form.Field
                name="password"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="space-y-0">
                      <div className="relative">
                        <Input
                          id={field.name}
                          name={field.name}
                          type={showPassword ? "text" : "password"}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          autoComplete="current-password"
                          // IMPORTANT: this is purposedly empty. placeholder must be a space
                          placeholder=" "
                          className="peer h-12 rounded-xl border-gray-200 bg-transparent px-3 pr-10 text-gray-900 placeholder-transparent focus:border-sky-500 focus:outline-none focus-visible:border-sky-500 focus-visible:ring-0"
                        />
                        {/* Floating Label */}
                        <label
                          htmlFor={field.name}
                          className="pointer-events-none absolute top-0 left-3 -translate-y-1/2 cursor-text bg-white px-1 text-xs text-sky-500 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-sky-500"
                        >
                          Password
                        </label>

                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              {/* Remember Me & Forgot Password Row */}
              <div className="flex flex-row items-center justify-between">
                <form.Field
                  name="rememberMe"
                  children={(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                        className="h-4 w-4 rounded border-gray-300 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500"
                      />
                      <label
                        htmlFor={field.name}
                        className="cursor-pointer text-sm font-normal text-gray-600 select-none"
                      >
                        Remember me
                      </label>
                    </div>
                  )}
                />

                <Link
                  to="/auth/forgot-password"
                  className="text-sm font-medium text-sky-500 hover:text-sky-600 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-full bg-[#1C9DDE] text-base font-semibold shadow-sm hover:bg-sky-600 disabled:opacity-50"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/auth/signup"
              className="font-medium text-sky-500 hover:text-sky-600 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
