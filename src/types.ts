export type GoNode =
  | GoRoot
  | GoBlock
  | GoInline
  | GoMultiBlock
  | GoUnformattable;

export type GoParentNode = 
  | GoRoot
  | GoBlock
  | GoMultiBlock;

export type GoRoot = { type: "root" } & Omit<
  GoBlock,
  | "type"
  | "keyword"
  | "parent"
  | "statement"
  | "startDelimiter"
  | "endDelimiter"
  | "start"
  | "end"
>;

export interface GoBlock extends GoBaseNode<"block">, WithDelimiter {
  keyword: GoBlockKeyword;
  children: Record<string, GoNode>;
  start: GoInline;
  end: GoInline | null;
  content: string;
  aliasedContent: string;
  contentStart: number;
}

export interface GoInline extends GoBaseNode<"inline">, WithDelimiter {
  statement: string;
}

export interface GoMultiBlock extends GoBaseNode<"multi-block"> {
  blocks: (GoBlock | GoMultiBlock)[];
  keyword: GoBlockKeyword;
}

export interface GoUnformattable extends GoBaseNode<"unformattable"> {
  content: string;
}

// --------------------------------------------------------------------

export interface GoBaseNode<Type extends string> {
  id: string;
  type: Type;
  index: number;
  length: number;
  parent: GoParentNode;
}

export interface WithDelimiter {
  startDelimiter: GoInlineStartDelimiter;
  endDelimiter: GoInlineEndDelimiter;
}

export type GoInlineStartDelimiter = "<" | "/*" | GoSharedDelimiter;
export type GoInlineEndDelimiter = ">" | "*/" | GoSharedDelimiter;
export type GoSharedDelimiter = "%" | "-" | "";

export type GoBlockKeyword =
  | "if"
  | "range"
  | "block"
  | "with"
  | "define"
  | "else"
  | "prettier-ignore-start"
  | "prettier-ignore-end"
  | "end";