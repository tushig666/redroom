import Engine from '@/components/game/Engine';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="w-screen h-screen bg-[#1d1717] relative overflow-hidden">
      <Engine />
      <Toaster />
    </main>
  );
}
