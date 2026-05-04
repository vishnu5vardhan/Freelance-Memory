import { Workspace } from "@/components/Workspace";

export default function WorkspacePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      <div className="memory-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative">
        <Workspace />
      </div>
    </main>
  );
}
