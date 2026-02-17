import type { GoNode, GoRoot, GoBlock, GoMultiBlock, GoBlockKeyword  } from "./types";
import { Parser } from "prettier";
import { assertIndexed, assertStatemented, tokenize } from "./tokenizer";
import { createNode } from "./nodes";

export const parseGoTemplate: Parser<GoNode>["parse"] = (text, _options) => {
  const root = createNode.root(text);
  const nodeStack: (GoRoot | GoBlock)[] = [root];

  for (const token of tokenize(text)) {
    const current = last(nodeStack);

    if (current === undefined) {
      throw Error("Node stack empty.");
    }

    assertIndexed(token);

    if (token.unformattable) {
      const node = createNode.unformattable(token, current);
      current.children[node.id] = node;
      continue;
    }

    assertStatemented(token);

    const inline = createNode.inline(token, current);

    if (token.keyword === "end" || token.keyword === "prettier-ignore-end") {
      if (current.type !== "block") {
        throw Error("Encountered unexpected end keyword.");
      }

      current.length = token.length + token.index - current.index;
      current.content = text.substring(current.contentStart, token.index);
      current.aliasedContent = aliasNodeContent(current);
      current.end = inline;

      if (current.parent.type === "multi-block") {
        const firstChild = current.parent.blocks[0];
        const lastChild = current.parent.blocks[current.parent.blocks.length - 1];
        current.parent.length = lastChild.index + lastChild.length - firstChild.index;
      }

      nodeStack.pop();
    } else if (isBlock(current) && token.keyword === "else") {
      if (!isMultiBlock(current.parent)) {
        throw Error("Encountered else outside of multi-block context.");
      }

      // Finalize current block
      current.length = token.length + token.index - current.index;
      current.content = text.substring(current.contentStart, token.index);
      current.aliasedContent = aliasNodeContent(current);

      // Create and add next block
      const nextChild = createNode.block(token, inline, current.parent);
      current.parent.blocks.push(nextChild);

      nodeStack.pop();
      nodeStack.push(nextChild);
    } else if (token.keyword) {
      const block = createNode.block(token, inline, current);

      if (canHaveElse(token.keyword)) {
        const multiBlock = createNode.multiBlock(block, current);
        block.parent = multiBlock;
        current.children[multiBlock.id] = multiBlock;
        nodeStack.push(block);
      } else {
        current.children[block.id] = block;
        nodeStack.push(block);
      }
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

function canHaveElse(keyword?: GoBlockKeyword): boolean {
  return ["if", "range", "with"].includes(keyword ?? "");
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

export function isBlock(node: GoNode): node is GoBlock {
  return node.type === "block";
}

export function isMultiBlock(node: GoNode): node is GoMultiBlock {
  return node.type === "multi-block";
}

export function isRoot(node?: GoNode): node is GoRoot {
  return node?.type === "root";
}
