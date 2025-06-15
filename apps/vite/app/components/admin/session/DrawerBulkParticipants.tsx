import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Form } from "~/components/ui/form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Loader2, Plus, X, UserPlus, CheckCircle, Search } from "lucide-react";
import { useSessionParticipants } from "~/hooks/use-session-participants";
import { useBulkParticipantsDialogStore } from "~/stores/use-bulk-participants-dialog-store";
import { toast } from "sonner";

// Validation schema - simplified without link expiration and email settings
const bulkParticipantsSchema = z.object({
  selected_participants: z
    .array(z.string())
    .min(1, "Minimal satu peserta harus dipilih"),
});

type FormData = z.infer<typeof bulkParticipantsSchema>;

export function DrawerBulkParticipants() {
  const {
    isBulkParticipantsDialogOpen,
    currentSessionId,
    currentSessionName,
    closeBulkParticipantsDialog,
  } = useBulkParticipantsDialogStore();
  const { useBulkAddParticipants, useGetAvailableUsers } =
    useSessionParticipants();
  const bulkAddMutation = useBulkAddParticipants();

  const [selectedUsers, setSelectedUsers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      nik: string | null;
    }>
  >([]);

  const [searchValue, setSearchValue] = useState("");

  // Get available users using the new API endpoint
  const { data: availableUsersResponse, isLoading: isLoadingUsers } =
    useGetAvailableUsers(currentSessionId || "", {
      role: "participant",
      limit: 50,
      search: searchValue || undefined,
    });

  const form = useForm<FormData>({
    resolver: zodResolver(bulkParticipantsSchema),
    defaultValues: {
      selected_participants: [],
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isBulkParticipantsDialogOpen) {
      form.reset();
      setSelectedUsers([]);
      setSearchValue("");
    }
  }, [isBulkParticipantsDialogOpen, form]);

  // Available users for selection
  const availableUsers = availableUsersResponse?.data || [];

  // Add user to selection
  const handleAddUser = (user: {
    id: string;
    name: string;
    email: string;
    nik: string | null;
  }) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      const newSelectedUsers = [...selectedUsers, user];
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

    const loadingToast = toast.loading("Menambahkan peserta...", {
      description: "Mohon tunggu, sedang memproses penambahan peserta",
      duration: 10000,
    });

    try {
      // Create participants array from selected users
      const participants = selectedUsers.map((user) => ({
        user_id: user.id,
        custom_message: undefined,
      }));

      await bulkAddMutation.mutateAsync({
        sessionId: currentSessionId,
        data: {
          participants,
          link_expires_hours: 24, // Default 24 hours
          send_invitations: false, // Default no email invitations
        },
      });

      toast.dismiss(loadingToast);
      closeBulkParticipantsDialog();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Bulk add participants error:", error);
      // Error handling is already done in the hook
    }
  };

  return (
    <Drawer
      open={isBulkParticipantsDialogOpen}
      onOpenChange={closeBulkParticipantsDialog}
      direction="right"
    >
      <DrawerContent className="h-full w-full max-w-md fixed right-0 top-0 mt-0 rounded-none">
        <DrawerHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DrawerTitle className="text-lg font-semibold">
                Tambah Peserta
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground">
                Pilih peserta untuk sesi "{currentSessionName}"
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 flex flex-col h-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search and User List */}
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Cari Peserta
                    </Label>
                    <Input
                      placeholder="Cari nama, email, atau NIK..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      disabled={bulkAddMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Menampilkan peserta yang belum terdaftar dalam sesi ini
                    </p>
                  </div>
                </div>

                {/* Available Users List */}
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 pt-0">
                      <Command className="rounded-lg border">
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingUsers
                              ? "Memuat peserta..."
                              : "Tidak ada peserta tersedia"}
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
                                .map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={user.id}
                                    onSelect={() => handleAddUser(user)}
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
                                  >
                                    <div className="flex flex-col gap-1 flex-1">
                                      <div className="font-medium text-sm">
                                        {user.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {user.email}
                                        {user.phone && ` • No hp ${user.phone}`}
                                      </div>
                                    </div>
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </div>
                  </ScrollArea>
                </div>

                {/* Selected Users Preview */}
                {selectedUsers.length > 0 && (
                  <div className="border-t bg-green-50/50">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          Peserta Terpilih ({selectedUsers.length})
                        </span>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between bg-white rounded-lg p-3 border"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {user.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(user.id)}
                              disabled={bulkAddMutation.isPending}
                              className="ml-2 h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DrawerFooter className="border-t bg-background">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeBulkParticipantsDialog}
                    disabled={bulkAddMutation.isPending}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      bulkAddMutation.isPending || selectedUsers.length === 0
                    }
                    className="flex-1"
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
                </div>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
