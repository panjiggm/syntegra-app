"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestParticipantsPage() {
  const [test, setTest] = useState("test");

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">TEST PARTICIPANTS PAGE</h1>
      <p className="mt-4">Path: /admin/test-participants</p>
      <Button onClick={() => setTest("clicked!")}>Test Button ({test})</Button>
    </div>
  );
}
