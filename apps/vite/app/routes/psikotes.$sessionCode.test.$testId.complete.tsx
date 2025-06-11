import type { Route } from "./+types/psikotes.$sessionCode.test.$testId.complete";

export function meta({ params }: Route.MetaArgs) {
  return [
    {
      title: `Psikotes ${params.sessionCode} - Syntegra - Tes ${params.testId} - Selesai`,
    },
    { name: "description", content: "Akses tes psikologi online" },
  ];
}

export default function PsikotesTestComplete() {
  return <div>PsikotesTestComplete</div>;
}
