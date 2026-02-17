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
    type: "root",
    content: text,
    aliasedContent: "",
    children: {},
    index: 0,
    contentStart: 0,
    length: text.length,
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
    index: token.index,
    length: token.length,
    startDelimiter: token.startDelimiter,
    endDelimiter: token.endDelimiter,
    parent,
    type: "inline",
    statement: token.statement,
    id: createID(),
  } satisfies GoInline;
}

function createBlockNode(token: Token & { index: number }, inline: GoInline, parent: GoParentNode): GoBlock {
  return {
    type: "block",
    start: inline,
    end: null,
    children: {},
    keyword: token.keyword as GoBlockKeyword,
    index: token.index,
    parent: parent,
    contentStart: token.index + token.length,
    content: "",
    aliasedContent: "",
    length: -1,
    id: createID(),
    startDelimiter: token.startDelimiter,
    endDelimiter: token.endDelimiter,
  } satisfies GoBlock;
}

function createMultiBlock(block: GoBlock, parent: GoParentNode): GoMultiBlock {
  return {
    type: "multi-block",
    parent: parent,
    index: block.index,
    length: -1,
    keyword: block.keyword,
    id: createID(),
    blocks: [block],
  } satisfies GoMultiBlock;
}
