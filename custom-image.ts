// src\components\editor\custom-image.ts

import { Node, nodeInputRule, mergeAttributes } from "@tiptap/core";

// Define the options interface
export interface CustomImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number | string;
        height?: number | string;
        href?: string;
      }) => ReturnType;
    };
  }
}

const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const CustomImage = Node.create<CustomImageOptions>({
  name: "customImage", 

  addOptions() {
    return {
      inline: true,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),

        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),

        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => {
          if (!attributes.href) return {};
          return { href: attributes.href };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[href] img[src]",
        getAttrs(dom) {
          const img = dom as HTMLImageElement;
          const parent = dom.parentNode as HTMLElement;
          return {
            src: img.getAttribute("src"),
            href: parent ? parent.getAttribute("href") : null,
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
          };
        },
        contentElement: "img",
      },
      {
        tag: this.options.allowBase64
          ? "img[src]"
          : 'img[src]:not([src^="data:"])',
        getAttrs(dom) {
          const img = dom as HTMLImageElement;
          return {
            src: img.getAttribute("src"),
            href: null,
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { href, ...imgAttributes } = HTMLAttributes;
    const mergedImgAttributes = mergeAttributes(
      this.options.HTMLAttributes,
      imgAttributes
    );

    if (href) {
      return ["a", { href }, ["img", mergedImgAttributes]];
    }
    return ["img", mergedImgAttributes];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },
});

export default CustomImage;
