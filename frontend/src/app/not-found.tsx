"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-6 py-16">
            <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1 text-center lg:text-left space-y-6">
                    <p className="text-[90px] leading-none font-extrabold text-[#226db4]">404</p>
                    <p className="text-2xl font-extrabold text-[#636363]">
                        Hey bro, you found a new island, but unfortunately, you're not allowed to go there.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 rounded bg-white text-[#226db4] border border-[#226db4] font-semibold hover:bg-[#e9f2fb]"
                        >
                            Go back
                        </button>
                        <Link
                            href="/"
                            className="px-4 py-2 rounded bg-[#226db4] text-white font-semibold hover:bg-[#1b5a94]"
                        >
                            Go home
                        </Link>
                    </div>
                </div>

                <div className="flex-1 w-full relative aspect-[4/3] max-w-[520px]">
                    <Image
                        src="/home/404.png"
                        alt="Relaxing on a beach with laptop illustration"
                        fill
                        priority
                        sizes="(min-width: 1024px) 520px, 80vw"
                        className="object-contain"
                    />
                </div>
            </div>
        </div>
    );
}
