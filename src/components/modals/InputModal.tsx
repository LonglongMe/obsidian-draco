import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { App, Modal } from "obsidian";
import React, { useState } from "react";
import { createRoot, Root } from "react-dom/client";

function InputModalContent({
  title,
  defaultValue,
  placeholder,
  onConfirm,
  onCancel,
  confirmButtonText,
  cancelButtonText,
}: {
  title: string;
  defaultValue: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  confirmButtonText: string;
  cancelButtonText: string;
}) {
  const [value, setValue] = useState(defaultValue);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus
      />
      <div className="tw-flex tw-justify-end tw-gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {cancelButtonText}
        </Button>
        <Button variant="default" onClick={handleConfirm} disabled={!value.trim()}>
          {confirmButtonText}
        </Button>
      </div>
    </div>
  );
}

export class InputModal extends Modal {
  private root: Root;

  constructor(
    app: App,
    private title: string,
    private defaultValue: string,
    private onConfirm: (value: string) => void,
    private placeholder?: string,
    private confirmButtonText: string = "Confirm",
    private cancelButtonText: string = "Cancel"
  ) {
    super(app);
    // @ts-ignore
    this.setTitle(title);
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createRoot(contentEl);

    const handleConfirm = (value: string) => {
      this.onConfirm(value);
      this.close();
    };

    const handleCancel = () => {
      this.close();
    };

    this.root.render(
      <InputModalContent
        title={this.title}
        defaultValue={this.defaultValue}
        placeholder={this.placeholder}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmButtonText={this.confirmButtonText}
        cancelButtonText={this.cancelButtonText}
      />
    );
  }

  onClose() {
    this.root.unmount();
  }
}
