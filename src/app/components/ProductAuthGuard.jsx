
"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import toast from "react-hot-toast";

export default function ProductAuthGuard({ children }) {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const toastShownRef = useRef(false);

    useEffect(() => {
        if (!isPending && !session?.user) {
            if (!toastShownRef.current) {
                toast.error(
                    "পণ্য বিস্তারিত দেখতে লগইন অথবা সাইন আপ করুন।"
                );
                toastShownRef.current = true;
            }

            const callbackURL = encodeURIComponent(pathname);

            router.replace(`/signup?callbackURL=${callbackURL}`);
        }
    }, [isPending, session, pathname, router]);

    if (isPending) {
        return <p className="p-6 text-center">লোড হচ্ছে...</p>;
    }

    if (!session?.user) {
        return <p className="p-6 text-center">Signup page-এ পাঠানো হচ্ছে...</p>;
    }

    return children;
}