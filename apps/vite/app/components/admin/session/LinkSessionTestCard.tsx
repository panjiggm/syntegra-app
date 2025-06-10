import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Session } from "~/hooks/use-sessions";

interface LinkSessionTestCardProps {
  session: Session;
}

export const LinkSessionTestCard = ({ session }: LinkSessionTestCardProps) => {
  const handleCopyParticipantLink = () => {
    if (session?.participant_link) {
      navigator.clipboard.writeText(session?.participant_link);
      toast.success("Link berhasil disalin!", {
        description: "Link partisipan telah disalin ke clipboard",
      });
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Link Partisipan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-3 bg-white rounded border font-mono text-sm">
            {session.participant_link}
          </div>
          <Button variant="outline" onClick={handleCopyParticipantLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button asChild>
            <a
              href={session.participant_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Buka
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
