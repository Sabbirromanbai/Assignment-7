"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession, signOut, authClient } from "@/lib/auth-client";
import { LogOut, UserRound, Pencil, X, Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfileUpdatePage() {
    const { data: session, isPending, refetch } = useSession();
    const router = useRouter();

    const [name, setName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // GitHub profile information
    const [githubImage, setGithubImage] = useState(null);
    const [githubLogin, setGithubLogin] = useState("");

    const user = session?.user;

    // Load GitHub avatar
    useEffect(() => {
        if (!session?.user?.id) {
            setGithubImage(null);
            setGithubLogin("");
            return;
        }

        let cancelled = false;

        async function loadGitHubProfile() {
            try {
                const response = await fetch(
                    "/api/profile/github-avatar",
                    { cache: "no-store" }
                );

                if (!response.ok) {
                    if (!cancelled) {
                        setGithubImage(null);
                        setGithubLogin("");
                    }
                    return;
                }

                const data = await response.json();

                if (!cancelled) {
                    setGithubImage(data.image || null);
                    setGithubLogin(data.login || "");
                }
            } catch (error) {
                console.error("GitHub profile loading failed:", error);
            }
        }

        loadGitHubProfile();

        return () => {
            cancelled = false;
        };
    }, [session?.user?.id]);

    // Sync name with session
    useEffect(() => {
        setName(session?.user?.name || "");
    }, [session?.user?.name]);

    const profileImage = githubImage || user?.image || null;

    const handleSignOut = async () => {
        try {
            await signOut({
                fetchOptions: {
                    onSuccess: () => {
                        toast.success("সফলভাবে লগ আউট হয়েছে।");
                        window.location.href = "/";
                    },
                },
            });
        } catch {
            toast.error("সাইন আউট করা যায়নি। আবার চেষ্টা করুন।");
        }
    };

    const handleUpdateName = async (event) => {
        event.preventDefault();

        const updatedName = name.trim();

        if (!updatedName) {
            toast.error("আপনার নাম লিখুন।");
            return;
        }

        if (updatedName.length > 100) {
            toast.error("নাম ১০০ অক্ষরের মধ্যে লিখুন।");
            return;
        }

        if (updatedName === user?.name) {
            toast.error("নামে কোনো পরিবর্তন করা হয়নি।");
            return;
        }

        setIsSaving(true);

        try {
            const { error } = await authClient.updateUser({
                name: updatedName,
            });

            if (error) {
                toast.error(error.message || "নাম আপডেট করা যায়নি।");
                return;
            }

            if (typeof refetch === "function") {
                await refetch();
            }

            router.refresh();
            toast.success("আপনার নাম সফলভাবে আপডেট হয়েছে!");
            router.push("/profile");
        } catch (error) {
            toast.error(error?.message || "সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        } finally {
            setIsSaving(false);
        }
    };

    if (isPending) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center bg-gray-50">
                <p className="text-gray-500">প্রোফাইল লোড হচ্ছে...</p>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="flex min-h-[60vh] flex-col items-center justify-center bg-gray-50 px-4 text-center">
                <UserRound className="mb-4 h-12 w-12 text-gray-400" />

                <h1 className="text-2xl font-bold text-gray-800">লগইন করা নেই</h1>

                <p className="mt-2 text-gray-600">
                    প্রোফাইল আপডেট করতে অনুগ্রহ করে লগইন করুন।
                </p>

                <button
                    type="button"
                    onClick={() => router.push("/signin")}
                    className="mt-5 rounded-lg bg-emerald-600 px-6 py-2.5 text-white hover:bg-emerald-700"
                >
                    লগইন করো
                </button>
            </main>
        );
    }

    return (
        <main className="mx-auto min-h-[70vh] max-w-3xl bg-gray-50 px-4 py-10">
            <div className="mb-8">
                <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    প্রোফাইলে ফিরে যান
                </button>
                <h1 className="text-3xl font-bold text-gray-900">প্রোফাইল আপডেট</h1>

                <p className="mt-2 text-sm text-gray-500">
                    আপনার অ্যাকাউন্টের তথ্য আপডেট করুন।
                </p>
            </div>

            <div className="space-y-6">
                <section className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                            {profileImage ? (
                                <Image
                                    key={profileImage}
                                    src={profileImage}
                                    alt={user.name || "User Avatar"}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                user.name?.charAt(0)?.toUpperCase() || "U"
                            )}
                        </div>

                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold text-gray-900">
                                {user.name || "ব্যবহারকারী"}
                            </h2>

                            <p className="truncate text-sm text-gray-500">
                                {user.email}
                            </p>

                            {githubLogin && (
                                <p className="mt-1 truncate text-sm text-gray-600">
                                    GitHub: @{githubLogin}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" />
                        সাইন আউট
                    </button>
                </section>

                <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                        ব্যক্তিগত তথ্য আপডেট
                    </h3>

                    <form onSubmit={handleUpdateName} className="space-y-5">
                        <div>
                            <label
                                htmlFor="profile-name"
                                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600"
                            >
                                <UserRound className="h-4 w-4" />
                                নাম
                            </label>

                            <input
                                id="profile-name"
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                maxLength={100}
                                required
                                className="w-full rounded-lg border border-emerald-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
                            </button>

                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => router.push("/profile")}
                                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                <X className="h-4 w-4" />
                                বাতিল
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    );
}
