import { UserTargetProgress } from "@/components/user-target-progress";

export default function MyTargets() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <UserTargetProgress />
      </div>
    </div>
  );
}
