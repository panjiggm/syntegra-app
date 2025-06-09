import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface DialogAddQuestionProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
}

export function DialogAddQuestion({
  isOpen,
  onClose,
  testId,
}: DialogAddQuestionProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Tambah Soal Baru</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <p className="text-muted-foreground">
            Dialog untuk menambah soal baru akan diimplementasikan di sini.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Test ID: {testId}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
