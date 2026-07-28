import { EngineSection } from "./features/EngineSection";
import { InterstitialBanner } from "./features/InterstitialBanner";
import { WorkflowSection } from "./features/WorkflowSection";

export function FeaturesSection() {
  return (
    <>
      <div className="border-t border-border-default bg-bg-elevated/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 lg:pt-20 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-accent shrink-0" />
            <span className="font-mono text-[10px] sm:text-xs text-accent tracking-widest uppercase">
              Why Pumpkin Hub
            </span>
          </div>
        </div>
      </div>
      <EngineSection />
      <InterstitialBanner />
      <WorkflowSection />
    </>
  );
}
