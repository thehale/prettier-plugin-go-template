import { createID } from "./create-id";
import { Token } from "./tokenizer";
import { GoBlock, GoBlockKeyword, GoInline, GoMultiBlock, GoParentNode, GoRoot, GoUnformattable } from "./types";

export const createNode = {
  root: createRootNode,
  unformattable: createUnformattableNode,
  inline: createInlineNode,
  block: createBlockNode,
  multiBlock: createMultiBlock,
}

function createRootNode(text: string): GoRoot {
  return {
    id: createID(),
    type: "root",
    index: 0,
    length: text.length,
    contentStart: 0,
    content: text,
    aliasedContent: "",
    children: {},
  } satisfies GoRoot;;
}

function createUnformattableNode(token: Token & { index: number }, parent: GoParentNode): GoUnformattable {
  return {
    id: createID(),
    type: "unformattable",
    index: token.index,
    length: token.length,
    content: token.unformattable ?? "",
    parent,
  } satisfies GoUnformattable;
}

function createInlineNode(token: Token & { index: number, statement: string }, parent: GoParentNode): GoInline {
  return {
    id: createID(),
    type: "inline",
    index: token.index,
    length: token.length,
    startDelimiter: token.startDelimiter,
    endDelimiter: token.endDelimiter,
    statement: token.statement,
    parent,
  } satisfies GoInline;
}

function createBlockNode(token: Token & { index: number }, inline: GoInline, parent: GoParentNode): GoBlock {
  return {
    id: createID(),
    type: "block",
    index: token.index,
    length: -1,
    startDelimiter: token.startDelimiter,
    endDelimiter: token.endDelimiter,
    start: inline,
    end: null,
    keyword: token.keyword as GoBlockKeyword,
    contentStart: token.index + token.length,
    content: "",
    aliasedContent: "",
    children: {},
    parent: parent,
  } satisfies GoBlock;
}

function createMultiBlock(block: GoBlock, parent: GoParentNode): GoMultiBlock {
  return {
    id: createID(),
    type: "multi-block",
    index: block.index,
    length: -1,
    keyword: block.keyword,
    blocks: [block],
    parent: parent,
  } satisfies GoMultiBlock;
}
