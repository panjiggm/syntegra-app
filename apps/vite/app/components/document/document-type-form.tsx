import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  type DocumentType,
  type CreateDocumentTypeRequest,
  type UpdateDocumentTypeRequest,
} from "~/hooks/use-document-types";

const generateKeyFromName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
};

interface BaseDocumentTypeFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  totalWeight: number;
  remainingWeight: number;
}

interface CreateDocumentTypeFormProps extends BaseDocumentTypeFormProps {
  mode: "create";
  documentType?: never;
  onSubmit: (data: CreateDocumentTypeRequest) => Promise<void>;
}

interface EditDocumentTypeFormProps extends BaseDocumentTypeFormProps {
  mode: "edit";
  documentType: DocumentType;
  onSubmit: (data: { id: string; data: UpdateDocumentTypeRequest }) => Promise<void>;
}

type DocumentTypeFormProps = CreateDocumentTypeFormProps | EditDocumentTypeFormProps;

export function DocumentTypeForm({
  isOpen,
  onOpenChange,
  mode,
  documentType,
  onSubmit,
  isPending,
  totalWeight,
  remainingWeight,
}: DocumentTypeFormProps) {
  const schema = React.useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, "Nama harus diisi")
          .max(255, "Nama maksimal 255 karakter"),
        weight: z
          .number()
          .min(0, "Bobot minimal 0")
          .max(
            remainingWeight,
            `Bobot maksimal ${remainingWeight} (sisa bobot yang tersedia)`
          )
          .optional(),
      }),
    [remainingWeight]
  );

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      weight: 1,
    },
  });

  React.useEffect(() => {
    if (isOpen && mode === "edit") {
      form.reset({
        name: documentType.name,
        weight: parseFloat(documentType.weight),
      });
    } else if (isOpen && mode === "create") {
      form.reset({
        name: "",
        weight: 1,
      });
    }
  }, [isOpen, mode, documentType, form]);

  const handleSubmit = async (data: FormData) => {
    try {
      const generatedKey = generateKeyFromName(data.name);
      
      if (mode === "create") {
        const payload: CreateDocumentTypeRequest = {
          key: generatedKey,
          name: data.name,
          weight: data.weight,
        };
        await onSubmit(payload);
      } else if (mode === "edit") {
        const payload: UpdateDocumentTypeRequest = {
          key: generatedKey,
          name: data.name,
          weight: data.weight,
        };
        await onSubmit({
          id: documentType.id,
          data: payload,
        });
      }
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(`Error ${mode === "create" ? "creating" : "updating"} document type:`, error);
    }
  };

  const title = mode === "create" ? "Tambah Tipe Dokumen" : "Edit Tipe Dokumen";
  const description = mode === "create" 
    ? "Buat tipe dokumen baru untuk administrasi peserta"
    : "Ubah informasi tipe dokumen";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            <br />
            <span
              className={`text-sm ${
                totalWeight > 80 ? "text-orange-600" : "text-muted-foreground"
              }`}
            >
              Total bobot saat ini: {totalWeight}/100. Sisa: {remainingWeight}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 mt-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nama Dokumen</Label>
            <Input
              id="name"
              placeholder="Contoh: Curriculum Vitae, Kartu Tanda Penduduk"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Bobot</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              placeholder="1"
              {...form.register("weight", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Maksimal {remainingWeight} (sisa bobot yang tersedia)
            </p>
            {form.formState.errors.weight && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.weight.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}