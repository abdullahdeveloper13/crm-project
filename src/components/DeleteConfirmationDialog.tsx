import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";

type DeleteConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  description?: string;
  isPending?: boolean;
  error?: unknown;
  onConfirm: () => void;
  confirmLabel?: string;
  title?: string;
};

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  itemLabel,
  description,
  isPending = false,
  error,
  onConfirm,
  confirmLabel = "Delete",
  title,
}: DeleteConfirmationDialogProps) {
  const errorMessage =
    error instanceof Error ? error.message : error ? "The operation failed." : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? `Delete ${itemLabel}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              `This will permanently delete this ${itemLabel.toLowerCase()}. This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isPending ? "Deleting..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
