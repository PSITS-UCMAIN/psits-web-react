import sidePhoto from "@/assets/temp_side_photo.png";

import {
  ForgotPasswordForm,
  type ForgotPasswordCredentials,
} from "@/features/auth";
import { forgotPassword } from "@/features/auth/api/forgot";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function ForgotPassword() {
  const handleForgotPassword = async (values: ForgotPasswordCredentials) => {
    return await forgotPassword(values.email, values.id);
  };

  return (
    <div className="flex h-screen w-screen flex-row bg-gray-300">
      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-sky-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      <div className="flex w-full items-center justify-center bg-white md:w-1/2">
        <ForgotPasswordForm onSubmit={handleForgotPassword} />
      </div>

      {/* Right Side: Image */}
      <div className="hidden h-full w-1/2 md:flex">
        <img
          src={sidePhoto}
          alt="Login visual"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
