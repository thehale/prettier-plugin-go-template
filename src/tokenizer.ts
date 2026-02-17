export function tokenize(text: string) {
  const regex = buildRegex();
  return text.matchAll(regex);
}

// ---------------------------------------------------------------------------------------

const TEMPLATE_START = '{{';
const TEMPLATE_END = '}}';
const START_DELIMITERS = ['-', '<', '%', '/*'];
const END_DELIMITERS = ['-', '>', '%', '*/'];
const BLOCK_KEYWORDS = ['if', 'range', 'block', 'with', 'define', 'end', 'else', 'prettier-ignore-start', 'prettier-ignore-end'];

function buildRegex() {
  const startDelimiter = String.raw`(?<startdelimiter>${pattern(START_DELIMITERS)})?`;
  const endDelimiter = String.raw`(?<endDelimiter>${pattern(END_DELIMITERS)})?`;
  const keyword = String.raw`(?<keyword>${pattern(BLOCK_KEYWORDS)})?`;
  const statement = String.raw`(?<statement>${keyword}[\s\S]*?)`;

  const goTemplate = String.raw`${TEMPLATE_START}${startDelimiter}\s*${statement}\s*${endDelimiter}${TEMPLATE_END}`;
  const unformattableScript = String.raw`(?<unformattableScript>${unformattableHtmlTag('script')})`;
  const unformattableStyle = String.raw`(?<unformattableStyle>${unformattableHtmlTag('style')})`;

  const regex = new RegExp(`${goTemplate}|${unformattableScript}|${unformattableStyle}`, 'g');

  TMP_validateRegex(regex);

  return regex;
}

function pattern(tokens: string[]) {
  return tokens.map(escape).join('|');
}

function escape(str: string) {
  return str.replace(/\*/g, '\\*');
}

/** Matches HTML tags whose contents open, but do not close, a Go template */
function unformattableHtmlTag(tagName: string) {
  const openingTag = String.raw`<(${tagName})`;                   // <tag
  const attributes = String.raw`((?!<)[\s\S])*>`;                 // attributes (no <) followed by >
  const contentLeading = String.raw`((?!<\/${tagName})[\s\S])*?`; // content not containing </tag
  const contentTrailing = String.raw`[\s\S]*?`;                   // followed by anything until...
  const closingTag = String.raw`<\/(${tagName})>`;                // </tag>
  return String.raw`${openingTag}${attributes}${contentLeading}${TEMPLATE_START}${contentTrailing}${closingTag}`;
};

const OG_REGEX =
    /{{(?<startdelimiter>-|<|%|\/\*)?\s*(?<statement>(?<keyword>if|range|block|with|define|end|else|prettier-ignore-start|prettier-ignore-end)?[\s\S]*?)\s*(?<endDelimiter>-|>|%|\*\/)?}}|(?<unformattableScript><(script)((?!<)[\s\S])*>((?!<\/script)[\s\S])*?{{[\s\S]*?<\/(script)>)|(?<unformattableStyle><(style)((?!<)[\s\S])*>((?!<\/style)[\s\S])*?{{[\s\S]*?<\/(style)>)/g;
function TMP_validateRegex(regex: RegExp) {
  if (regex.source !== OG_REGEX.source) {
    console.error("Regex mismatch!");
    console.error("\nOriginal:");
    console.error(OG_REGEX.source);
    console.error("\nNew:");
    console.error(regex.source);
    console.error("\nDifference:");
    const ogLines = OG_REGEX.source.split('|');
    const newLines = regex.source.split('|');
    ogLines.forEach((line, i) => {
      if (line !== newLines[i]) {
        console.error(`\nPart ${i}:`);
        console.error(`  OG:  ${line}`);
        console.error(`  New: ${newLines[i]}`);
      }
    });
    throw new Error("Regex has changed. Please verify that the new regex correctly captures all intended patterns.");
  }
}