import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import React from "react";

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  onConfirm: () => void;
}

/**
 * Sidebar quick action: name a new project and jump to its overview page.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  projectName,
  onProjectNameChange,
  onConfirm,
}: CreateProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onProjectNameChange("");
      }}
    >
      <DialogContent className="tw-max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Enter a project name, then go directly to its project page.</DialogDescription>
        </DialogHeader>
        <Input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Project name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onConfirm();
            }
          }}
        />
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              onProjectNameChange("");
            }}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
