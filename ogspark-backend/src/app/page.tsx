
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/types/user";

export default function LaunchPage() {
  const router = useRouter();

  React.useEffect(() => {
    const determineRedirect = async () => {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.replace('/login');
        return;
      }
      
      // TODO: This logic should be updated when backend is implemented
      // to redirect to the correct dashboard based on user role.
      // Defaulting to profile for now if a user object exists.
      switch (currentUser.role) {
            case "student":
              router.push("/dashboard/student");
              break;
            case "faculty":
               router.push("/dashboard/faculty");
               break;
            case "hod":
               router.push("/dashboard/hod");
               break;
             case "account_section":
               router.push("/fees");
               break;
            case "admin":
              router.push("/admin");
              break;
            default:
              router.push("/profile");
        }
    };

    determineRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white overflow-hidden">
      <div className="z-10 text-center animate-in fade-in zoom-in-90 duration-1000">
        <video
          src="/pogo-animation.mp4"
          width="280"
          height="280"
          autoPlay
          muted
          playsInline
          className="mx-auto mb-6 filter drop-shadow-lg"
        />
        <p className="mt-4 text-lg text-blue-300/80 animate-pulse">
          Launching...
        </p>
      </div>
    </div>
  );
}
