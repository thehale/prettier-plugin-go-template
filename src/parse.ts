import type { GoNode, GoRoot, GoBlock, GoInline, GoMultiBlock, GoBlockKeyword, GoUnformattable, GoParentNode  } from "./types";
import { Parser } from "prettier";
import { createID } from "./create-id";
import { assertIndexed, assertStatemented, Token, tokenize } from "./tokenizer";

export const parseGoTemplate: Parser<GoNode>["parse"] = (text, _options) => {
  const root = createRootNode(text);
  const nodeStack: (GoRoot | GoBlock)[] = [root];

  for (const token of tokenize(text)) {
    const current = last(nodeStack);

    if (current === undefined) {
      throw Error("Node stack empty.");
    }

    assertIndexed(token);

    if (token.unformattable) {
      const node = createUnformattableNode(token, current);
      current.children[node.id] = node;
      continue;
    }

    assertStatemented(token);

    const inline = createInlineNode(token, current);

    if (token.keyword === "end" || token.keyword === "prettier-ignore-end") {
      if (current.type !== "block") {
        throw Error("Encountered unexpected end keyword.");
      }

      current.length = token.length + token.index - current.index;
      current.content = text.substring(current.contentStart, token.index);
      current.aliasedContent = aliasNodeContent(current);
      current.end = inline;

      if (current.parent.type === "double-block") {
        const firstChild = current.parent.blocks[0];
        const lastChild =
          current.parent.blocks[current.parent.blocks.length - 1];

        current.parent.length =
          lastChild.index + lastChild.length - firstChild.index;
      }

      nodeStack.pop();
    } else if (isBlock(current) && token.keyword === "else") {
      const nextChild = createBlockNode(token, inline, current.parent);

      if (isMultiBlock(current.parent)) {
        current.parent.blocks.push(nextChild);
      } else {
        const multiBlock: GoMultiBlock = {
          type: "double-block",
          parent: current.parent,
          index: current.index,
          length: -1,
          keyword: token.keyword as GoBlockKeyword,
          id: current.id,
          blocks: [current, nextChild],
        };
        nextChild.parent = multiBlock;
        current.parent = multiBlock;

        if ("children" in multiBlock.parent) {
          multiBlock.parent.children[multiBlock.id] = multiBlock;
        } else {
          throw Error("Could not find child in parent.");
        }
      }

      current.id = createID();
      current.length = token.length + token.index - current.index;
      current.content = text.substring(current.contentStart, token.index);
      current.aliasedContent = aliasNodeContent(current);

      nodeStack.pop();
      nodeStack.push(nextChild);
    } else if (token.keyword) {
      const block = createBlockNode(token, inline, current);
      current.children[block.id] = block;
      nodeStack.push(block);
    } else {
      current.children[inline.id] = inline;
    }
  }

  if (!isRoot(nodeStack.pop())) {
    throw Error("Missing end block.");
  }

  root.aliasedContent = aliasNodeContent(root);

  return root;
};

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

function aliasNodeContent(current: GoBlock | GoRoot): string {
  let result = current.content;

  Object.entries(current.children)
    .sort(([_id1, node1], [_id2, node2]) => node2.index - node1.index)
    .forEach(
      ([id, node]) =>
        (result =
          result.substring(0, node.index - current.contentStart) +
          id +
          result.substring(node.index + node.length - current.contentStart)),
    );

  return result;
}

function last<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

export function isInline(node: GoNode): node is GoInline {
  return node.type === "inline";
}

export function isBlock(node: GoNode): node is GoBlock {
  return node.type === "block";
}

export function isMultiBlock(node: GoNode): node is GoMultiBlock {
  return node.type === "double-block";
}

export function isRoot(node?: GoNode): node is GoRoot {
  return node?.type === "root";
}

export function isUnformattable(node: GoNode): node is GoRoot {
  return node.type === "unformattable";
}

