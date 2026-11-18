import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

async function Form({ search }: { search: Promise<{ next?: string }> }) {
  const { next } = await search;
  return <SignInForm next={typeof next === "string" ? next : undefined} />;
}

export default function IngresarPage({ searchParams }: PageProps<"/ingresar">) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-6 font-display text-4xl font-semibold">Ingresar</h1>
      <Suspense fallback={<div className="h-64 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <Form search={searchParams as Promise<{ next?: string }>} />
      </Suspense>
    </main>
  );
}
