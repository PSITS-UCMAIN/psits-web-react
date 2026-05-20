import { SignupForm, type SignupCredentials } from "@/features/auth";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

const courses = ["BSIT", "BSCS"];

export default function Signup() {
  const handleSignup = (_values: SignupCredentials) => {
    // insert signup here
  };

  return (
    <div className="relative flex h-screen w-screen flex-row bg-gray-300">
      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-sky-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="flex w-full items-center justify-center bg-white md:w-1/2">
        <SignupForm onSignup={handleSignup} courses={courses} />
      </div>
    </div>
  );
}
