
'use client';
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// This page is now a directory for other pages.
// Redirect to the first sub-item.
export default function CourseCreatorRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/add-course');
    }, [router]);

    return null; // Or a loading spinner
}
