"use client";

import NeuralConnectionsWidget from "@/components/NeuralConnectionsWidget";
import BrainReportWidget from "@/components/BrainReportWidget";
import AIActionQueueWidget from "@/components/AIActionQueueWidget";

export default function HomeBrainIntelligenceCards() {
  return (
    <div
      style={{
        left: "var(--left-aside-width, 300px)",
        right: "var(--right-aside-width, 300px)",
        zIndex: 70,
      }}
      className="fixed top-4 hidden lg:block"
    >
      <div className="grid grid-cols-3 items-start gap-3">
        <NeuralConnectionsWidget />
        <BrainReportWidget />
        <AIActionQueueWidget />
      </div>
    </div>
  );
}