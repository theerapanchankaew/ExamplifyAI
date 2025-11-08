
'use client';

import { AdminAuthGuard } from "@/components/admin-auth-guard";

export default function DashboardPage() {
  return (
    <AdminAuthGuard />
  );
}

    