"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function DescriptionEditor(props: {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  className?: string;
}) {
  const lastExternalHtmlRef = React.useRef(props.valueHtml || "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          class:
            "text-primary underline underline-offset-4 decoration-border hover:decoration-foreground",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class:
            "w-full max-w-full rounded-lg border border-border my-3 block",
        },
      }),
      Placeholder.configure({
        placeholder:
          "Write a description… Paste an image (it will upload), add links, format text.",
      }),
    ],
    content: props.valueHtml || "",
    onUpdate: ({ editor }) => {
      props.onChangeHtml(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[280px] w-full rounded-lg border border-border bg-background px-4 py-3 text-[18px] leading-7 outline-none",
      },
      handlePaste: (view, event) => {
        const e = event as ClipboardEvent;
        const files = Array.from(e.clipboardData?.files ?? []);
        const image = files.find((f) => f.type.startsWith("image/"));
        if (!image) return false;

        (async () => {
          try {
            const url = await uploadImage(image);
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: url })
              )
            );
          } catch {
            toast.error("Couldn’t upload image");
          }
        })();
        return true;
      },
      handleDrop: (view, event) => {
        const e = event as DragEvent;
        const files = Array.from(e.dataTransfer?.files ?? []);
        const image = files.find((f) => f.type.startsWith("image/"));
        if (!image) return false;

        (async () => {
          try {
            const url = await uploadImage(image);
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: url })
              )
            );
          } catch {
            toast.error("Couldn’t upload image");
          }
        })();
        return true;
      },
    },
  });

  // Keep editor content in sync when parent updates the HTML (e.g. when opening with a prefilled screenshot).
  React.useEffect(() => {
    if (!editor) return;
    const external = props.valueHtml || "";
    if (external === lastExternalHtmlRef.current) return;
    lastExternalHtmlRef.current = external;

    const current = editor.getHTML();
    if (external !== current) {
      editor.commands.setContent(external, false);
    }
  }, [editor, props.valueHtml]);

  const toggleLink = () => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Paste link URL", existing || "https://");
    if (!href || !href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className={cn("relative", props.className)}>
      {editor ? (
        <>
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur"
          >
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="h-8 px-2"
            >
              B
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="h-8 px-2"
            >
              I
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("strike") ? "secondary" : "ghost"}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className="h-8 px-2"
            >
              S
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("link") ? "secondary" : "ghost"}
              onClick={toggleLink}
              className="h-8 px-2"
            >
              Link
            </Button>
          </BubbleMenu>

          <FloatingMenu
            editor={editor}
            options={{ placement: "left" }}
            shouldShow={({ editor, state }) => {
              // Show on empty paragraph at cursor (block-menu vibe)
              const { $from } = state.selection;
              const node = $from.parent;
              return (
                editor.isEditable &&
                node.type.name === "paragraph" &&
                node.content.size === 0
              );
            }}
            className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur"
          >
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="h-8 px-2"
            >
              H2
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className="h-8 px-2"
            >
              H3
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className="h-8 px-2"
            >
              • List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className="h-8 px-2"
            >
              1.
            </Button>
          </FloatingMenu>
        </>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}


