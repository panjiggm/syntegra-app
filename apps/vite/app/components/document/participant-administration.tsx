import React from "react";
import { Users } from "lucide-react";

export function ParticipantAdministration() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Users className="w-16 h-16 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Administrasi Peserta
          </h3>
          <p className="text-gray-500">
            Fitur administrasi peserta akan segera tersedia
          </p>
        </div>
      </div>
    </div>
  );
}