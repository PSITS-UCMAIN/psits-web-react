import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo_forms_100x100.png";
import {
  STUDENT_ID_LENGTH,
  STUDENT_ID_MESSAGE,
  validateId,
} from "@/utils/studentId";

const TEST_WORD_PATTERN =
  /(^|\b)(test|asdf|qwerty|sample|dummy|foobar|admin|demo|example|placeholder|lorem|ipsum|temp|fake|junk|noreply|nobody|whatever|asdasd|zzz|aaa|hello|hehe|haha|wala)(\b|$)/i;

function isSuspiciousName(value: string) {
  return TEST_WORD_PATTERN.test(value.trim());
}

function isSuspiciousEmail(email: string): boolean {
  const localPart = email.split("@")[0];

  // Too short (1-2 chars, covers single digits too)
  if (localPart.length <= 2) return true;

  // Contains obvious test/junk words (e.g. "test@gmail.com")
  if (TEST_WORD_PATTERN.test(localPart)) return true;

  // Keyboard mashing / repeating same char (e.g. "aaaaa@gmail.com")
  if (/^(.)\1{2,}$/.test(localPart)) return true;

  return false;
}

const baseSchema = z.object({
  id: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      const result = validateId(val, { rejectSuspicious: true });
      if (!result.valid) {
        ctx.addIssue({
          code: "custom",
          message: result.message ?? STUDENT_ID_MESSAGE,
        });
      }
    }),
  lname: z
    .string()
    .min(1, "Last name is required")
    .refine((val) => !isSuspiciousName(val), {
      message: "Please enter your real last name",
    }),
  mname: z.string().optional(),
  fname: z
    .string()
    .min(1, "First name is required")
    .refine((val) => !isSuspiciousName(val), {
      message: "Please enter your real first name",
    }),
  email: z
    .email({ error: "Invalid email address" })
    .refine((val) => !isSuspiciousEmail(val), {
      message: "Please enter a valid, real email address",
    }),
  course: z.string().min(1, "Course is required"),
  year: z.string().min(1, "Year level is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Must include at least one small letter")
    .regex(/[A-Z]/, "Must include at least one capital letter")
    .regex(/[\d\W]/, "Must include at least one number or symbol"),
  confirmPassword: z.string(),
});

const formSchema = baseSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export type SignupCredentials = z.infer<typeof formSchema>;

const STEPS = ["name", "id-email", "course-year", "password"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Step, (keyof SignupCredentials)[]> = {
  name: ["lname", "fname"],
  "id-email": ["id", "email"],
  "course-year": ["course", "year"],
  password: ["password", "confirmPassword"],
};

export interface SignupFormProps {
  courses?: string[];
  years?: string[];
  onSignup?: (values: SignupCredentials) => void;
  isSubmitting?: boolean;
}

const inputClasses =
  "peer h-12 rounded-xl border-gray-200 bg-transparent px-3 text-gray-900 placeholder-transparent focus:border-sky-500 focus:outline-none focus-visible:border-sky-500 focus-visible:ring-0";

const floatingLabelClasses =
  "pointer-events-none absolute top-0 left-3 -translate-y-1/2 cursor-text bg-white px-1 text-xs text-sky-500 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-sky-500";

export default function SignupForm({
  onSignup,
  courses = [],
  years = ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  isSubmitting = false,
}: SignupFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [attemptedSteps, setAttemptedSteps] = useState<Record<Step, boolean>>({
    name: false,
    "id-email": false,
    "course-year": false,
    password: false,
  });

  const form = useForm({
    defaultValues: {
      id: "",
      lname: "",
      fname: "",
      email: "",
      course: "",
      year: "",
      password: "",
      confirmPassword: "",
    } as SignupCredentials,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }: { value: SignupCredentials }) =>
      onSignup && onSignup(value),
  });

  const goNext = async () => {
    const fields = STEP_FIELDS[step];

    const results = await Promise.all(
      fields.map((name) => form.validateField(name, "submit"))
    );

    let confirmMismatch = false;
    if (step === "password") {
      const pw = form.getFieldValue("password");
      const confirm = form.getFieldValue("confirmPassword");
      confirmMismatch = pw !== confirm;
    }

    setAttemptedSteps((prev) => ({ ...prev, [step]: true }));

    fields.forEach((name) =>
      form.setFieldMeta(name, (prev) => ({ ...prev, isTouched: true }))
    );

    const hasEmptyOrInvalid = fields.some((name) => {
      const value = form.getFieldValue(name);
      return value === "" || value === undefined;
    });

    const hasErrors =
      results.some((errs) => errs && errs.length > 0) ||
      hasEmptyOrInvalid ||
      confirmMismatch;

    if (!hasErrors) {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }
  };

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  return (
    <Card className="w-full border-none shadow-none sm:max-w-md">
      <CardHeader className="mb-[12px] flex flex-col items-center space-y-2 text-center">
        <div className="mb-4 flex h-18 w-18 items-center justify-center overflow-hidden rounded-full bg-slate-100">
          <img src={logo} alt="Logo" className="h-full w-full object-cover" />
        </div>
        <CardTitle className="text-4xl font-semibold tracking-tight text-gray-900">
          {step === "name" && "Create an account"}
          {step === "id-email" && "Create an account"}
          {step === "course-year" && "Academic Details"}
          {step === "password" && "Set a Password"}
        </CardTitle>
        <CardDescription className="text-base text-gray-500">
          {step === "name" && "Enter your name"}
          {step === "id-email" &&
            "Enter your student ID number and email address to get started"}
          {step === "course-year" &&
            "Select your course and current year level"}
          {step === "password" && "Choose a secure password"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <form
          id="signup-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (isSubmitting) return;
            if (!isLastStep) {
              goNext();
              return;
            }
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FieldGroup>
            <FieldSet>
              {step === "name" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Last Name */}
                    <form.Field
                      name="lname"
                      validators={{ onSubmit: baseSchema.shape.lname }}
                      children={(field) => {
                        const isInvalid =
                          (field.state.meta.isTouched ||
                            attemptedSteps[step]) &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid} className="space-y-0">
                            <div className="relative">
                              <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                aria-invalid={isInvalid}
                                placeholder=" "
                                autoComplete="off"
                                className={inputClasses}
                              />
                              <label
                                htmlFor={field.name}
                                className={floatingLabelClasses}
                              >
                                Last Name
                              </label>
                            </div>
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />
                    {/* Middle Name */}
                    <form.Field
                      name="mname"
                      children={(field) => {
                        return (
                          <Field className="space-y-0">
                            <div className="relative">
                              <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                placeholder=" "
                                autoComplete="off"
                                className={inputClasses}
                              />
                              <label
                                htmlFor={field.name}
                                className={floatingLabelClasses}
                              >
                                Middle Name
                              </label>
                            </div>
                          </Field>
                        );
                      }}
                    />
                  </div>
                  {/* First Name */}
                  <form.Field
                    name="fname"
                    validators={{ onSubmit: baseSchema.shape.fname }}
                    children={(field) => {
                      const isInvalid =
                        (field.state.meta.isTouched || attemptedSteps[step]) &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid} className="space-y-0">
                          <div className="relative">
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder=" "
                              autoComplete="off"
                              className={inputClasses}
                            />
                            <label
                              htmlFor={field.name}
                              className={floatingLabelClasses}
                            >
                              First Name
                            </label>
                          </div>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                </>
              )}

              {step === "id-email" && (
                <>
                  {/* Student ID Number */}
                  <form.Field
                    name="id"
                    validators={{ onSubmit: baseSchema.shape.id }}
                    children={(field) => {
                      const isInvalid =
                        (field.state.meta.isTouched || attemptedSteps[step]) &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid} className="space-y-0">
                          <div className="relative">
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder=" "
                              autoComplete="off"
                              inputMode="numeric"
                              maxLength={STUDENT_ID_LENGTH}
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
                    validators={{ onSubmit: baseSchema.shape.email }}
                    children={(field) => {
                      const isInvalid =
                        (field.state.meta.isTouched || attemptedSteps[step]) &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid} className="space-y-0">
                          <div className="relative">
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                </>
              )}

              {step === "course-year" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Course */}
                  <form.Field
                    name="course"
                    validators={{ onSubmit: baseSchema.shape.course }}
                    children={(field) => {
                      const isInvalid =
                        (field.state.meta.isTouched || attemptedSteps[step]) &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel>Course</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                          >
                            <SelectTrigger className="h-12 w-full rounded-xl border-gray-200">
                              <SelectValue placeholder="Choose course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course, index) => (
                                <SelectItem key={index} value={course}>
                                  {course}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                  {/* Year */}
                  <form.Field
                    name="year"
                    validators={{ onSubmit: baseSchema.shape.year }}
                    children={(field) => {
                      const isInvalid =
                        (field.state.meta.isTouched || attemptedSteps[step]) &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel>Year</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                          >
                            <SelectTrigger className="h-12 w-full rounded-xl border-gray-200">
                              <SelectValue placeholder="Choose year" />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map((year, index) => (
                                <SelectItem key={index} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                </div>
              )}

              {step === "password" && (
                <div className="space-y-4">
                  {/* Password */}
                  <form.Field
                    name="password"
                    validators={{ onSubmit: baseSchema.shape.password }}
                    children={(field) => {
                      const isInvalid =
                        (field.state.meta.isTouched || attemptedSteps[step]) &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid} className="space-y-0">
                          <div className="relative">
                            <Input
                              id={field.name}
                              name={field.name}
                              type={showPassword ? "text" : "password"}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder=" "
                              autoComplete="off"
                              className={`${inputClasses} pr-10`}
                            />
                            <label
                              htmlFor={field.name}
                              className={floatingLabelClasses}
                            >
                              Password
                            </label>
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setShowPassword((s) => !s)}
                              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  {/* Confirm Password */}
                  <form.Field
                    name="confirmPassword"
                    validators={{
                      onSubmit: ({ value, fieldApi }) => {
                        if (!value)
                          return { message: "Please confirm your password" };
                        const pw = fieldApi.form.getFieldValue("password");
                        return value !== pw
                          ? { message: "Passwords don't match" }
                          : undefined;
                      },
                    }}
                    children={(field) => {
                      const isInvalid =
                        (field.state.meta.isTouched || attemptedSteps[step]) &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid} className="space-y-0">
                          <div className="relative">
                            <Input
                              id={field.name}
                              name={field.name}
                              type={showConfirm ? "text" : "password"}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder=" "
                              autoComplete="off"
                              className={`${inputClasses} pr-10`}
                            />
                            <label
                              htmlFor={field.name}
                              className={floatingLabelClasses}
                            >
                              Confirm Password
                            </label>
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setShowConfirm((s) => !s)}
                              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirm ? (
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
                  <form.Subscribe selector={(state) => state.values.password}>
                    {(password) => {
                      const requirements = [
                        {
                          label: "At least 8 characters",
                          met: password.length >= 8,
                        },
                        {
                          label: "At least one small letter",
                          met: /[a-z]/.test(password),
                        },
                        {
                          label: "At least one capital letter",
                          met: /[A-Z]/.test(password),
                        },
                        {
                          label: "At least one number or symbol",
                          met: /[\d\W]/.test(password),
                        },
                      ];

                      return (
                        <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
                          {requirements.map((req) => (
                            <div
                              key={req.label}
                              className="flex items-center gap-2"
                            >
                              <Check
                                className={`h-4 w-4 ${req.met ? "text-green-500" : "text-gray-300"}`}
                              />
                              <p
                                className={`text-xs ${req.met ? "text-green-600" : "text-gray-500"}`}
                              >
                                {req.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  </form.Subscribe>
                </div>
              )}
            </FieldSet>

            <Field orientation="vertical">
              <div className="flex gap-2">
                {stepIndex > 0 && !isLastStep && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={isSubmitting}
                    className="h-11 flex-1 rounded-full"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 flex-1 rounded-full bg-[#1C9DDE] text-base font-semibold shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : isLastStep ? (
                    "Sign Up"
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
