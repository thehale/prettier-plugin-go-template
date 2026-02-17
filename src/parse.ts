import type { GoNode, GoRoot, GoBlock, GoInline, GoMultiBlock, GoBlockKeyword, GoInlineStartDelimiter, GoInlineEndDelimiter  } from "./types";
import { Parser } from "prettier";
import { createID } from "./create-id";

export const parseGoTemplate: Parser<GoNode>["parse"] = (text, _options) => {
  const regex =
    /{{(?<startdelimiter>-|<|%|\/\*)?\s*(?<statement>(?<keyword>if|range|block|with|define|end|else|prettier-ignore-start|prettier-ignore-end)?[\s\S]*?)\s*(?<endDelimiter>-|>|%|\*\/)?}}|(?<unformattableScript><(script)((?!<)[\s\S])*>((?!<\/script)[\s\S])*?{{[\s\S]*?<\/(script)>)|(?<unformattableStyle><(style)((?!<)[\s\S])*>((?!<\/style)[\s\S])*?{{[\s\S]*?<\/(style)>)/g;
  const root: GoRoot = {
    type: "root",
    content: text,
    aliasedContent: "",
    children: {},
    index: 0,
    contentStart: 0,
    length: text.length,
  };
  const nodeStack: (GoBlock | GoRoot)[] = [root];

  for (const match of text.matchAll(regex)) {
    const current = last(nodeStack);
    const keyword = match.groups?.keyword as GoBlockKeyword | undefined;
    const statement = match.groups?.statement;
    const unformattable = match.groups?.unformattableScript ?? match.groups?.unformattableStyle;

    const startDelimiter = (match.groups?.startdelimiter ?? "") as GoInlineStartDelimiter;
    const endDelimiter = (match.groups?.endDelimiter ?? "") as GoInlineEndDelimiter;

    if (current === undefined) {
      throw Error("Node stack empty.");
    }

    if (match.index === undefined) {
      throw Error("Regex match index undefined.");
    }
    const id = createID();
    if (unformattable) {
      current.children[id] = {
        id,
        type: "unformattable",
        index: match.index,
        length: match[0].length,
        content: unformattable,
        parent: current,
      };
      continue;
    }

    if (statement === undefined) {
      throw Error("Formattable match without statement.");
    }

    const inline: GoInline = {
      index: match.index,
      length: match[0].length,
      startDelimiter,
      endDelimiter,
      parent: current,
      type: "inline",
      statement,
      id,
    };

    if (keyword === "end" || keyword === "prettier-ignore-end") {
      if (current.type !== "block") {
        throw Error("Encountered unexpected end keyword.");
      }

      current.length = match[0].length + match.index - current.index;
      current.content = text.substring(current.contentStart, match.index);
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
    } else if (isBlock(current) && keyword === "else") {
      const nextChild: GoBlock = {
        type: "block",
        start: inline,
        end: null,
        children: {},
        keyword: keyword,
        index: match.index,
        parent: current.parent,
        contentStart: match.index + match[0].length,
        content: "",
        aliasedContent: "",
        length: -1,
        id: createID(),
        startDelimiter,
        endDelimiter,
      };

      if (isMultiBlock(current.parent)) {
        current.parent.blocks.push(nextChild);
      } else {
        const multiBlock: GoMultiBlock = {
          type: "double-block",
          parent: current.parent,
          index: current.index,
          length: -1,
          keyword,
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
      current.length = match[0].length + match.index - current.index;
      current.content = text.substring(current.contentStart, match.index);
      current.aliasedContent = aliasNodeContent(current);

      nodeStack.pop();
      nodeStack.push(nextChild);
    } else if (keyword) {
      const block: GoBlock = {
        type: "block",
        start: inline,
        end: null,
        children: {},
        keyword: keyword as GoBlockKeyword,
        index: match.index,
        parent: current,
        contentStart: match.index + match[0].length,
        content: "",
        aliasedContent: "",
        length: -1,
        id: createID(),
        startDelimiter,
        endDelimiter,
      };

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
