"use client";

import React, { useState } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ParticipantsManagementPage() {
  const [test, setTest] = useState("test");

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Participants Page - MINIMAL</h1>
      <p className="mt-4">Just basic imports - no shared-types, no hooks</p>
      <div className="flex gap-2">
        <Button onClick={() => setTest("clicked")}>
          <Download className="h-4 w-4 mr-2" />
          Test Button ({test})
        </Button>
      </div>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Test state: {test}</p>
        <p>Page rendered successfully!</p>
      </div>
    </div>
  );
}
