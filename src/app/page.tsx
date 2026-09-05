import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">ServiAqui</h1>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/sign-in" />}>
          Entrar
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/sign-up" />}
        >
          Criar conta
        </Button>
      </div>
    </main>
  );
}
