import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import logo from "@/assets/logo_forms_100x100.png";

const forgotPasswordSchema = z.object({
  id: z.string().min(8, "ID Number must at least be 8 digits."),
  email: z.email({ error: "Invalid email address" }),
});

export type ForgotPasswordCredentials = z.infer<typeof forgotPasswordSchema>;

export interface ForgotPasswordFormProps {
  onSubmit?: (
    values: ForgotPasswordCredentials
  ) => boolean | void | Promise<boolean | void>;
}

const RESEND_COOLDOWN_SECONDS = 120;
const COOLDOWN_STORAGE_KEY = "forgotPasswordCooldownEnd";

const formatCooldown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const getStoredRemainingSeconds = () => {
  const storedEnd = Number(sessionStorage.getItem(COOLDOWN_STORAGE_KEY));
  if (!storedEnd) return 0;
  return Math.max(0, Math.ceil((storedEnd - Date.now()) / 1000));
};

// Matches LoginForm.tsx / SignupForm.tsx exactly
const inputClasses =
  "peer h-12 rounded-xl border-gray-200 bg-transparent px-3 text-gray-900 placeholder-transparent focus:border-sky-500 focus:outline-none focus-visible:border-sky-500 focus-visible:ring-0";

const floatingLabelClasses =
  "pointer-events-none absolute top-0 left-3 -translate-y-1/2 cursor-text bg-white px-1 text-xs text-sky-500 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-sky-500";

export default function ForgotPasswordForm({
  onSubmit,
}: ForgotPasswordFormProps) {
  const [cooldown, setCooldown] = useState(getStoredRemainingSeconds);

  useEffect(() => {
    if (cooldown <= 0) {
      sessionStorage.removeItem(COOLDOWN_STORAGE_KEY);
      return;
    }
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const form = useForm({
    defaultValues: {
      id: "",
      email: "",
    } as ForgotPasswordCredentials,
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ value }: { value: ForgotPasswordCredentials }) => {
      if (!onSubmit) return;
      const result = await onSubmit(value);
      if (result !== false) {
        sessionStorage.setItem(
          COOLDOWN_STORAGE_KEY,
          String(Date.now() + RESEND_COOLDOWN_SECONDS * 1000)
        );
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    },
  });

  return (
    <Card className="w-full border-none shadow-none sm:max-w-md">
      <CardHeader className="mb-[12px] flex flex-col items-center space-y-2 text-center">
        <div className="mb-4 flex h-18 w-18 items-center justify-center overflow-hidden rounded-full bg-slate-100">
          <img src={logo} alt="Logo" className="h-full w-full object-cover" />
        </div>
        <CardTitle className="text-4xl font-semibold tracking-tight text-gray-900">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-base text-gray-500">
          Enter your student ID number to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <form
          id="forgot-password-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FieldGroup>
            <FieldSet>
              {/* Student ID Number */}
              <form.Field
                name="id"
                validators={{ onSubmit: forgotPasswordSchema.shape.id }}
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
                          placeholder=" "
                          autoComplete="off"
                          className={inputClasses}
                        />
                        <label
                          htmlFor={field.name}
                          className={floatingLabelClasses}
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
              {/* Email Address */}
              <form.Field
                name="email"
                validators={{ onSubmit: forgotPasswordSchema.shape.email }}
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
                          placeholder=" "
                          autoComplete="off"
                          className={inputClasses}
                        />
                        <label
                          htmlFor={field.name}
                          className={floatingLabelClasses}
                        >
                          Email Address
                        </label>
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
            </FieldSet>

            <Field orientation="vertical">
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    disabled={isSubmitting || cooldown > 0}
                    className="h-11 w-full rounded-full bg-[#1C9DDE] text-base font-semibold shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : cooldown > 0 ? (
                      `Resend in ${formatCooldown(cooldown)}`
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                )}
              </form.Subscribe>
              <Link to="/auth/login">
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-11 w-full rounded-full text-base font-medium text-gray-700"
                >
                  Back to Sign In
                </Button>
              </Link>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
