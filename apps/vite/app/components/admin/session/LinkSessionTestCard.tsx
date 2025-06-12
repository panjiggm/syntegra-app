import { Copy, ExternalLink } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Session } from "~/hooks/use-sessions";
import { useCallback, useRef, useState } from "react";
import { toPng, toJpeg } from "html-to-image";

interface LinkSessionTestCardProps {
  session: Session;
}

export const LinkSessionTestCard = ({ session }: LinkSessionTestCardProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [showQr, setShowQr] = useState(false);

  const handleCopyParticipantLink = () => {
    if (session?.participant_link) {
      navigator.clipboard.writeText(session?.participant_link);
      toast.success("Link berhasil disalin!", {
        description: "Link partisipan telah disalin ke clipboard",
      });
    }
  };

  const handleDownload = useCallback(
    async (format: "png" | "jpeg") => {
      if (!qrRef.current) return;
      try {
        const dataUrl =
          format === "png"
            ? await toPng(qrRef.current)
            : await toJpeg(qrRef.current, { quality: 0.95 });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${session.session_code}.${format === "png" ? "png" : "jpg"}`;
        link.click();
      } catch (error) {
        console.error(error);
        toast.error("Gagal mengunduh QR Code");
      }
    },
    [session.session_code]
  );

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Link Partisipan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 p-3 bg-white rounded border font-mono text-sm overflow-x-auto">
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

        {/* Toggle button */}
        {session.participant_link && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => setShowQr((prev) => !prev)}
          >
            {showQr ? "Sembunyikan QR Code" : "Tampilkan QR Code"}
          </Button>
        )}

        <div className="flex flex-col items-center gap-4">
          {session.participant_link && showQr && (
            <div
              className="inline-block bg-white p-4 rounded shadow gap-4"
              ref={qrRef}
            >
              <p className="text-base font-semibold text-center break-words">
                {session.session_name}
              </p>
              <div className="flex justify-center py-2">
                <QRCode value={session.participant_link} size={180} />
              </div>
              {session.start_time && (
                <p className="text-sm text-muted-foreground text-center">
                  {new Date(session.start_time).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" • "}
                  {new Date(session.start_time).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {session.end_time &&
                    ` - ${new Date(session.end_time).toLocaleTimeString(
                      "id-ID",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}`}
                </p>
              )}
              <p className="text-sm text-center font-medium">
                Syntegra Psikotes
              </p>
            </div>
          )}

          {session.participant_link && showQr && (
            <div className="mt-4 flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("png")}
              >
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("jpeg")}
              >
                JPG
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
