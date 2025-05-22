// src\components\editor\editor.tsx

import "./editor.css";
import MenuBar from "./menu-bar";
import { useEffect } from "react";
import {
  Editor as TipTapEditor,
  EditorContent,
  useEditor,
} from "@tiptap/react";
import { EditorView } from "@tiptap/pm/view";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import Typography from "@tiptap/extension-typography";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import CustomImage from "./custom-image";
import { uploadFile } from "@/lib/file-upload";
import { toast } from "sonner";
import { AxiosProgressEvent } from "axios";
import StarterKit from "@tiptap/starter-kit";

interface EditorProps {
  content?: string;
  onUpdate?: (props: { editor: TipTapEditor }) => void;
  disabled?: boolean;
}

const Editor = ({ content = "", disabled }: EditorProps) => {
  const handleDrop = (view: EditorView, event: DragEvent): boolean | void => {
    console.log("Dropped files:", event.dataTransfer?.files);

    if (!event.dataTransfer?.files?.length) {
      return false;
    }

    const files = Array.from(event.dataTransfer.files);

    const acceptedTypes = ["image/jpeg", "image/png", "image/gif"];
    const imageFiles = files.filter((file) =>
      acceptedTypes.includes(file.type)
    );
    const invalidFiles = files.filter(
      (file) => !acceptedTypes.includes(file.type)
    );

    if (invalidFiles.length > 0) {
      toast.error("Please Drop only valid image files (JPEG, PNG, or GIF)");
      if (imageFiles.length === 0) {
        return false;
      }
    }

    if (imageFiles.length === 0) return false;

    event.preventDefault();

    const { schema } = view.state;
    const pos = view.state.selection.from;

    for (const file of imageFiles) {
      uploadFile(file, (progressEvent: AxiosProgressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
        );
        console.log(`Upload progress for ${file.name}: ${percent}%`);
      })
        .then(({ fileUrl }) => {
          const node = schema.nodes.customImage.create({
            src: fileUrl,
          });

          const transaction = view.state.tr.insert(pos, node);

          view.dispatch(transaction);

          console.log("Dropped image inserted:", fileUrl);
          toast.success(`Image "${file.name}" uploaded successfully!`);
        })
        .catch((error) => {
          console.error("Drop upload failed:", error);
          toast.error(`Failed to upload image "${file.name}".`);
        });
    }

    return true; 
  };

  const handlePaste = (
    view: EditorView,
    event: ClipboardEvent
  ): boolean | void => {
    if (!event.clipboardData?.files?.length) {
      return false;
    }

    const files = Array.from(event.clipboardData.files);

    const acceptedTypes = ["image/jpeg", "image/png", "image/gif"];
    const imageFiles = files.filter((file) =>
      acceptedTypes.includes(file.type)
    );

    const invalidFiles = files.filter(
      (file) => !acceptedTypes.includes(file.type)
    );
    if (invalidFiles.length > 0) {
      toast.error("Please paste only valid image files (JPEG, PNG, or GIF).");
      if (imageFiles.length === 0) {
        return false;
      }
    }

    if (imageFiles.length === 0) {
      return false;
    }

    event.preventDefault();

    const { schema } = view.state;
    const pos = view.state.selection.from;

    for (const file of imageFiles) {
      uploadFile(file, (progressEvent: AxiosProgressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
        );
        console.log(`Upload progress for ${file.name}: ${percent}%`);
      })
        .then(({ fileUrl }) => {
          const node = schema.nodes.customImage.create({
            src: fileUrl,
          });
          const transaction = view.state.tr.insert(pos, node);
          view.dispatch(transaction);
          console.log("Pasted image inserted:", fileUrl);
          toast.success(`Image "${file.name}" uploaded successfully!`);
        })
        .catch((error) => {
          console.error("Paste upload failed:", error);
          toast.error(`Failed to upload image "${file.name}".`);
        });
    }

    return true;
  };

  const extensions = [
    StarterKit.configure({
      bulletList: {
        HTMLAttributes: { class: "list-disc ml-3" },
      },
      orderedList: {
        HTMLAttributes: { class: "list-decimal ml-3" },
      },
      horizontalRule: {
        HTMLAttributes: { class: "my-4 border-t border-gray-300" },
      },
      dropcursor: { color: "#00f", width: 2 },
    }),

    TextAlign.configure({ types: ["heading", "paragraph"] }),
    CustomImage,
    Underline,
    Typography,
    Highlight.configure({ multicolor: true }),
    TextStyle.configure({ mergeNestedSpanStyles: true }),
    Color,
    FontFamily,
    Youtube.configure({ controls: false, nocookie: true }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      protocols: ["http", "https"],
      isAllowedUri: (url, ctx) => {
        try {
          const parsedUrl = url.includes(":")
            ? new URL(url)
            : new URL(`${ctx.defaultProtocol}://${url}`);
          const disallowedProtocols = ["ftp", "file", "mailto"];
          const protocol = parsedUrl.protocol.replace(":", "");
          if (disallowedProtocols.includes(protocol)) return false;

          const allowedProtocols = ctx.protocols.map((p) =>
            typeof p === "string" ? p : p.scheme
          );
          if (!allowedProtocols.includes(protocol)) return false;

          const disallowedDomains = [
            "example-phishing.com",
            "malicious-site.net",
          ];
          const domain = parsedUrl.hostname;
          if (disallowedDomains.includes(domain)) return false;

          return true;
        } catch {
          return false;
        }
      },
      shouldAutoLink: (url) => {
        try {
          const parsedUrl = url.includes(":")
            ? new URL(url)
            : new URL(`https://${url}`);
          const disallowedDomains = [
            "example-no-autolink.com",
            "another-no-autolink.com",
          ];
          const domain = parsedUrl.hostname;
          return !disallowedDomains.includes(domain);
        } catch {
          return false;
        }
      },
    }),
  ];

  const editor = useEditor({
    extensions,

    content,

    editorProps: {
      attributes: {
        class:
          "overflow-auto min-h-[160px] max-h-[400px] rounded-b-lg py-2 px-3 border-b border-l border-r -mt-2 focus:shadow-lg transition duration-1000",
      },
      handleDrop,
      handlePaste,
    },

    editable: !disabled,
  });

  console.log(editor?.schema);
  console.log(editor?.getHTML());
  console.log(editor?.getJSON());

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [editor, content]);

  return (
    <div className="">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} aria-label="Rich text editor" />
    </div>
  );
};

export default Editor;
