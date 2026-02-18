import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as prettier from "prettier";
import * as GoTemplatePlugin from "./index";

const testFolder = join(__dirname, "tests");
const tests = readdirSync(testFolder);

describe("format", () => {
  tests.forEach((test) =>
    it(test, async () => {
      const path = join(testFolder, test);
      const input = readFileSync(join(path, "input.html")).toString();
      const expected = readFileSync(join(path, "expected.html")).toString();
      const config = getConfig(path);

      const expectedError = expected.match(/Error\("(?<message>.*)"\)/)?.groups?.message;

      if (expectedError) {
        jest.spyOn(console, "error").mockImplementation();
        await expect(prettify(input, config)).rejects.toEqual(new Error(expectedError));
      } else {
        const result = await prettify(input, config);
        expect(result).toEqual(expected);

        // A prettified output should change when prettified again.
        const repeatedResult = await prettify(result, config)
        expect(repeatedResult).toEqual(expected);
      }
    }),
  );
});

function getConfig(path: string) {
  const configPath = join(path, "config.json");
  const configString = existsSync(configPath) && readFileSync(configPath)?.toString();
  return configString ? JSON.parse(configString) : {};
}

function prettify(
  code: string,
  options: Partial<GoTemplatePlugin.PrettierPluginGoTemplateParserOptions>,
) {
  return prettier.format(code, { parser: "go-template", plugins: [GoTemplatePlugin], ...options });
}
