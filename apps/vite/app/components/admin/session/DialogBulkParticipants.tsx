import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Loader2,
  Users,
  Plus,
  X,
  UserPlus,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { useSessionParticipants } from "~/hooks/use-session-participants";
import { useBulkParticipantsDialogStore } from "~/stores/use-bulk-participants-dialog-store";
import { useUsers } from "~/hooks/use-users";
import { toast } from "sonner";

// Validation schema
const bulkParticipantsSchema = z.object({
  selected_participants: z
    .array(z.string())
    .min(1, "Minimal satu peserta harus dipilih"),
  link_expires_hours: z
    .number()
    .min(1, "Minimal 1 jam")
    .max(168, "Maksimal 168 jam (7 hari)"),
  send_invitations: z.boolean(),
});

type FormData = z.infer<typeof bulkParticipantsSchema>;

export function DialogBulkParticipants() {
  const {
    isBulkParticipantsDialogOpen,
    currentSessionId,
    currentSessionName,
    closeBulkParticipantsDialog,
  } = useBulkParticipantsDialogStore();
  const { useBulkAddParticipants } = useSessionParticipants();
  const bulkAddMutation = useBulkAddParticipants();

  const { useGetUsers } = useUsers();
  const { data: usersResponse, isLoading: isLoadingUsers } = useGetUsers({
    role: "participant",
    limit: 100,
  });

  const [selectedUsers, setSelectedUsers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      nik: string | null;
    }>
  >([]);

  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [userSearchValue, setUserSearchValue] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(bulkParticipantsSchema),
    defaultValues: {
      selected_participants: [],
      link_expires_hours: 24,
      send_invitations: true,
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isBulkParticipantsDialogOpen) {
      form.reset();
      setSelectedUsers([]);
      setIsUserSelectOpen(false);
      setUserSearchValue("");
    }
  }, [isBulkParticipantsDialogOpen, form]);

  // Available users for selection
  const availableUsers = usersResponse?.data || [];

  // Add user to selection
  const handleAddUser = (userId: string) => {
    const user = availableUsers.find((u) => u.id === userId);
    if (user && !selectedUsers.find((u) => u.id === userId)) {
      const newSelectedUsers = [
        ...selectedUsers,
        {
          id: user.id,
          name: user.name,
          email: user.email,
          nik: user.nik,
        },
      ];
      setSelectedUsers(newSelectedUsers);
      form.setValue(
        "selected_participants",
        newSelectedUsers.map((u) => u.id)
      );
    }
  };

  // Remove user from selection
  const handleRemoveUser = (userId: string) => {
    const newSelectedUsers = selectedUsers.filter((u) => u.id !== userId);
    setSelectedUsers(newSelectedUsers);
    form.setValue(
      "selected_participants",
      newSelectedUsers.map((u) => u.id)
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!currentSessionId) {
      toast.error("Session tidak valid", {
        description: "Silakan tutup dialog dan coba lagi",
      });
      return;
    }

    try {
      const loadingToast = toast.loading("Menambahkan peserta...", {
        description: "Mohon tunggu, sedang memproses penambahan peserta",
      });

      // Create participants array from selected users
      const participants = selectedUsers.map((user) => ({
        user_id: user.id,
        custom_message: undefined, // Could add custom message field later
      }));

      await bulkAddMutation.mutateAsync({
        sessionId: currentSessionId,
        data: {
          participants,
          link_expires_hours: data.link_expires_hours,
          send_invitations: data.send_invitations,
        },
      });

      toast.dismiss(loadingToast);
      closeBulkParticipantsDialog();
    } catch (error) {
      console.error("Bulk add participants error:", error);
      // Error handling is already done in the hook
    }
  };

  return (
    <Dialog
      open={isBulkParticipantsDialogOpen}
      onOpenChange={closeBulkParticipantsDialog}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Tambah Peserta Secara Bulk
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Tambahkan beberapa peserta sekaligus ke sesi "
                {currentSessionName}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 h-full"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 pb-4">
                {/* User Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pilih Peserta
                  </Label>

                  <Popover
                    open={isUserSelectOpen}
                    onOpenChange={setIsUserSelectOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isUserSelectOpen}
                        className="w-full justify-between"
                        disabled={isLoadingUsers || bulkAddMutation.isPending}
                      >
                        Pilih peserta untuk ditambahkan...
                        <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Cari peserta..."
                          value={userSearchValue}
                          onValueChange={setUserSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingUsers
                              ? "Memuat peserta..."
                              : "Tidak ada peserta ditemukan"}
                          </CommandEmpty>
                          {!isLoadingUsers && availableUsers.length > 0 && (
                            <CommandGroup>
                              {availableUsers
                                .filter(
                                  (user) =>
                                    !selectedUsers.find(
                                      (selected) => selected.id === user.id
                                    )
                                )
                                .filter(
                                  (user) =>
                                    user.name
                                      .toLowerCase()
                                      .includes(
                                        userSearchValue.toLowerCase()
                                      ) ||
                                    user.email
                                      .toLowerCase()
                                      .includes(
                                        userSearchValue.toLowerCase()
                                      ) ||
                                    (user.nik &&
                                      user.nik
                                        .toLowerCase()
                                        .includes(
                                          userSearchValue.toLowerCase()
                                        ))
                                )
                                .map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={user.id}
                                    onSelect={() => {
                                      handleAddUser(user.id);
                                      setIsUserSelectOpen(false);
                                      setUserSearchValue("");
                                    }}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="font-medium">
                                        {user.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {user.email}{" "}
                                        {user.nik && `• NIK: ${user.nik}`}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <p className="text-sm text-muted-foreground">
                    Cari dan pilih peserta dari dropdown di atas. Maksimal 50
                    peserta per batch.
                  </p>
                </div>

                {/* Selected Users Preview */}
                {selectedUsers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        Peserta Terpilih ({selectedUsers.length})
                      </span>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="space-y-2">
                        {selectedUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between bg-white rounded p-2 border"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {user.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.email} {user.nik && `• NIK: ${user.nik}`}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(user.id)}
                              disabled={bulkAddMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Pengaturan</span>
                  </div>

                  {/* Link Expiration */}
                  <FormField
                    control={form.control}
                    name="link_expires_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Masa Berlaku Link (Jam)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={168}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value, 10))
                            }
                            disabled={bulkAddMutation.isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Berapa lama link akses peserta akan berlaku (1-168
                          jam)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Send Invitations */}
                  <FormField
                    control={form.control}
                    name="send_invitations"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={bulkAddMutation.isPending}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Kirim undangan email otomatis</FormLabel>
                          <FormDescription>
                            Kirim email undangan beserta link akses ke semua
                            peserta
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="flex-shrink-0 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeBulkParticipantsDialog}
                disabled={bulkAddMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  bulkAddMutation.isPending || selectedUsers.length === 0
                }
              >
                {bulkAddMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menambahkan...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah {selectedUsers.length} Peserta
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
