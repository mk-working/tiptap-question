// src\components\editor\menu-bar.tsx

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquareQuote,
  Minus,
  Pilcrow,
  Strikethrough,
  Underline,
  Unlink,
  Video,
  WrapText,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { uploadFile } from "@/lib/file-upload";
import { toast } from "sonner";
import { Node } from "prosemirror-model";

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  // Link
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  // Video
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [height, setHeight] = useState("480");
  const [width, setWidth] = useState("640");
  const [videoError, setVideoError] = useState<string | null>(null);

  // Image
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // __________________Image___________________

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !editor) return;

      // Validate file type
      const acceptedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!acceptedTypes.includes(file.type)) {
        toast.error("Please select a valid image file (JPEG, PNG, or GIF).");
        return;
      }

      setIsUploading(true);

      try {
        const { fileUrl } = await uploadFile(file);
        editor
          .chain()
          .focus()
          .setImage({
            src: fileUrl,
            width: undefined,
            height: undefined,
          })
          .run();
      } catch (error) {
        console.error("Image upload failed:", error);
        toast.error("Failed to upload image. Please try again.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [editor]
  );

  // __________________LINK___________________

  const setLink = useCallback(() => {
    if (!editor) return;

    const { selection } = editor.state;
    const { $from, $to } = selection;
    let node: Node | null = null;
    let pos: number | null = null;

    editor.state.doc.nodesBetween($from.pos, $to.pos, (n, p) => {
      if (n.type.name === "customImage") {
        node = n;
        pos = p;
        return false;
      }
      return true;
    });

    if (node && pos !== null) {
      const currentNode = node as Node;
      const currentHref = currentNode.attrs.href || "";
      setLinkUrl(currentHref);
      setIsLinkDialogOpen(true);
    } else {
      const previousUrl = editor.getAttributes("link").href || "";
      setLinkUrl(previousUrl);
      setIsLinkDialogOpen(true);
    }
  }, [editor]);

  const handleSaveLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl && !/^https?:\/\/.+$/.test(linkUrl)) {
      setLinkError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    const { selection } = editor.state;
    const { $from, $to } = selection;
    let node: Node | null = null;
    let pos: number | null = null;

    editor.state.doc.nodesBetween($from.pos, $to.pos, (n, p) => {
      if (n.type.name === "customImage") {
        node = n;
        pos = p;
        return false;
      }
      return true;
    });

    if (node && pos !== null) {
      const currentNode = node as Node;
      const newAttrs = { ...currentNode.attrs, href: linkUrl || null };
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          if (pos !== null) {
            tr.setNodeMarkup(pos, undefined, newAttrs);
          }
          return true;
        })
        .run();
    } else {
      if (linkUrl === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        try {
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: linkUrl })
            .run();
        } catch (e: unknown) {
          if (e instanceof Error) {
            toast.error(e.message);
          } else {
            toast.error("An unexpected error occurred");
          }
        }
      }
    }

    setIsLinkDialogOpen(false);
    setLinkUrl("");
    setLinkError(null);
  }, [editor, linkUrl]);

  const handleCancelLink = useCallback(() => {
    setIsLinkDialogOpen(false);
    setLinkUrl("");
    setLinkError(null);
  }, []);

  const unsetLink = useCallback(() => {
    if (!editor) return;

    // Check if a customImage node is selected
    const { selection } = editor.state;
    const { $from, $to } = selection;
    let node: Node | null = null;
    let pos: number | null = null;

    editor.state.doc.nodesBetween($from.pos, $to.pos, (n, p) => {
      if (n.type.name === "customImage") {
        node = n;
        pos = p;
        return false;
      }
      return true;
    });

    if (node && pos !== null) {
      // Remove the href attribute from the customImage node
      const currentNode = node as Node;
      const newAttrs = { ...currentNode.attrs, href: null };
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          if (pos !== null) {
            tr.setNodeMarkup(pos, undefined, newAttrs);
          }
          return true;
        })
        .run();
    } else {
      // Handle text links
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
  }, [editor]);

  // __________________VIDEO___________________

  const openVideoDialog = useCallback(() => {
    setVideoUrl("");
    setWidth("300");
    setHeight("240");
    setIsVideoDialogOpen(true);
  }, []);

  const handleSaveVideo = useCallback(() => {
    if (!editor || !videoUrl) return;

    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([A-Za-z0-9_-]{11})/;

    if (!youtubeRegex.test(videoUrl)) {
      setVideoError(
        "Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)"
      );
      return;
    }

    const widthNum = Math.max(320, parseInt(width, 10)) || 640;
    const heightNum = Math.max(180, parseInt(height, 10)) || 480;

    editor.commands.setYoutubeVideo({
      src: videoUrl,
      width: widthNum,
      height: heightNum,
    });

    setIsVideoDialogOpen(false);
    setVideoUrl("");
  }, [editor, videoUrl, width, height]);

  const handleCancelVideo = useCallback(() => {
    setIsVideoDialogOpen(false);
    setVideoUrl("");
  }, []);

  // __________________Clear Format___________________

  const clearFormatting = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().run();
  }, [editor]);

  // __________________Set Color___________________

  const setColor = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().setColor(color).run();
    },
    [editor]
  );

  // __________________Set Highlight___________________

  const setHighlightColor = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().toggleHighlight({ color: color }).run();
    },
    [editor]
  );

  // __________________Set Paragraph___________________

  const setParagraph = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setParagraph().run();
  }, [editor]);

  const isParagraphActive = () => {
    return (
      editor?.isActive("paragraph") &&
      !editor.isActive("heading") &&
      !editor.isActive("bulletList") &&
      !editor.isActive("orderedList") &&
      !editor.isActive("blockquote")
    );
  };

  if (!editor) {
    return null;
  }

  // ______________Font and Color_______________

  const fontOptions = [
    { value: "inter", label: "Inter" },
    { value: "comic-sans", label: "Comic Sans" },
    { value: "serif", label: "Serif" },
    { value: "monospace", label: "Monospace" },
    { value: "cursive", label: "Cursive" },
    { value: "title-font", label: "CSS Variable" },
    { value: "exo-2", label: "Exo 2" },
    { value: "Kantumruy Pro", label: "Kantumruy Pro" },
    { value: "unset", label: "Default" },
  ];

  const colorOptions = [
    { value: "#FF0000", label: "Red" },
    { value: "#00FF00", label: "Green" },
    { value: "#0000FF", label: "Blue" },
    { value: "#FFFF00", label: "Yellow" },
    { value: "#FF00FF", label: "Magenta" },
  ];

  const handleFontChange = (value: string) => {
    if (value === "unset") {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      const fontFamilyMap: { [key: string]: string } = {
        inter: "Inter",
        "comic-sans": '"Comic Sans MS", "Comic Sans"',
        serif: "serif",
        monospace: "monospace",
        cursive: "cursive",
        "title-font": "var(--title-font-family)",
        "Kantumruy Pro": "Kantumruy Pro",
        "exo-2": '"Exo 2"',
      };
      editor.chain().focus().setFontFamily(fontFamilyMap[value]).run();
    }
  };

  const Options = [
    {
      icon: <Pilcrow className="size-4" />,
      onclick: setParagraph,
      pressed: isParagraphActive(),
    },
    {
      icon: <Heading1 className="size-4" />,
      onclick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      pressed: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: <Heading2 className="size-4" />,
      onclick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      pressed: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: <Heading3 className="size-4" />,
      onclick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      pressed: editor.isActive("heading", { level: 3 }),
    },
    {
      icon: <Bold className="size-4" />,
      onclick: () => editor.chain().focus().toggleBold().run(),
      pressed: editor.isActive("bold"),
    },
    {
      icon: <Italic className="size-4" />,
      onclick: () => editor.chain().focus().toggleItalic().run(),
      pressed: editor.isActive("italic"),
    },
    {
      icon: <Underline className="size-4" />,
      onclick: () => editor.chain().focus().toggleUnderline().run(),
      pressed: editor.isActive("underline"),
    },
    {
      icon: <Strikethrough className="size-4" />,
      onclick: () => editor.chain().focus().toggleStrike().run(),
      pressed: editor.isActive("strike"),
    },
    {
      icon: <AlignLeft className="size-4" />,
      onclick: () => editor.chain().focus().setTextAlign("left").run(),
      pressed: editor.isActive({ textAlign: "left" }),
    },
    {
      icon: <AlignCenter className="size-4" />,
      onclick: () => editor.chain().focus().setTextAlign("center").run(),
      pressed: editor.isActive({ textAlign: "center" }),
    },
    {
      icon: <AlignRight className="size-4" />,
      onclick: () => editor.chain().focus().setTextAlign("right").run(),
      pressed: editor.isActive({ textAlign: "right" }),
    },
    {
      icon: <List className="size-4" />,
      onclick: () => editor.chain().focus().toggleBulletList().run(),
      pressed: editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered className="size-4" />,
      onclick: () => editor.chain().focus().toggleOrderedList().run(),
      pressed: editor.isActive("orderedList"),
    },
    {
      icon: <MessageSquareQuote className="size-4" />,
      onclick: () => editor.chain().focus().toggleBlockquote().run(),
      pressed: editor.isActive("blockquote"),
    },
    {
      icon: <WrapText className="size-4" />,
      onclick: () => editor.chain().focus().setHardBreak().run(),
      pressed: false,
    },
    {
      icon: <Minus className="size-4" />,
      onclick: () => editor.chain().focus().setHorizontalRule().run(),
      pressed: false,
    },
    {
      icon: <ImageIcon className="size-4" />,
      onclick: openFilePicker,
      pressed: false,
      disabled: isUploading,
    },
    {
      icon: <Link className="size-4" />,
      onclick: () => setLink(),
      pressed: editor.isActive("link"),
    },
    {
      icon: <Unlink className="size-4" />,
      onclick: unsetLink, // Use the unsetLink function
      pressed: false,
    },
    {
      icon: <Video className="size-4" />,
      onclick: () => openVideoDialog(),
      pressed: false,
    },
    {
      icon: <Eraser className="size-4" />,
      onclick: () => clearFormatting(),
      pressed: false,
    },
  ];

  return (
    <>
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif"
        style={{ display: "none" }}
      />

      {/* Base Menu Bar */}
      <div className="flex flex-wrap gap-1 overflow-x-auto p-2 rounded-t-lg transition duration-1000 focus:shadow-2xl border-t border-r border-l ">
        {Options.map((option, index) => (
          <Toggle
            key={index}
            pressed={option.pressed}
            onClick={option.onclick}
            className="shrink-0"
            disabled={option.disabled}
          >
            {option.icon}
          </Toggle>
        ))}

        {/* Color Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Toggle
              pressed={editor.isActive("textStyle", {
                color: colorOptions.some(
                  (c) => c.value === editor.getAttributes("textStyle").color
                )
                  ? editor.getAttributes("textStyle").color
                  : false,
              })}
            >
              <Baseline className="size-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-40">
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((color) => (
                <Button
                  key={color.value}
                  variant="outline"
                  className="w-6 h-6 p-0"
                  style={{ backgroundColor: color.value }}
                  onClick={() => setColor(color.value)}
                  title={color.label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlighter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Toggle
              pressed={editor.isActive("highlight", {
                color: colorOptions.some(
                  (c) => c.value === editor.getAttributes("highlight").color
                )
                  ? editor.getAttributes("highlight").color
                  : false,
              })}
            >
              <Highlighter className="size-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-40">
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((color) => (
                <Button
                  key={color.value}
                  variant="outline"
                  className="w-6 h-6 p-0"
                  style={{ backgroundColor: color.value }}
                  onClick={() => setHighlightColor(color.value)}
                  title={color.label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Font Family */}
        <div className="mb-2 mt-0">
          <Select onValueChange={handleFontChange} defaultValue="unset">
            <SelectTrigger className="w-full border rounded-md">
              <SelectValue placeholder="Select Font" />
            </SelectTrigger>
            <SelectContent className="bg-white border rounded-md shadow-lg">
              {fontOptions.map((font, index) => (
                <SelectItem
                  key={index}
                  value={font.value}
                  className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert or Edit Link</DialogTitle>
            <DialogDescription>
              Enter a URL to create or edit a link in the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setLinkError(null);
              }}
              placeholder="Enter URL (e.g., https://example.com)"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLink();
              }}
            />
            {linkError && (
              <p className="text-sm text-red-600 -mt-2">{linkError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelLink}>
              Cancel
            </Button>
            <Button onClick={handleSaveLink}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert YouTube Video</DialogTitle>
            <DialogDescription>
              Enter a YouTube URL and dimensions to embed a video.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setVideoError(null);
              }}
              placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveVideo();
              }}
            />
            {videoError && (
              <p className="-mt-2 text-sm text-red-600">{videoError}</p>
            )}
            <div className="flex gap-4">
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="Width (px)"
                min="320"
                className="w-24"
              />
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Height (px)"
                min="180"
                className="w-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelVideo}>
              Cancel
            </Button>
            <Button onClick={handleSaveVideo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MenuBar;
