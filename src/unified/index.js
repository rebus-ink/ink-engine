// const engine = require("unified-engine");
const unified = require("unified");
const parse = require("./parse");
// const stringify = require("rehype-stringify");
const text = require("./rehype-text");
const latin = require("retext-latin");
const wordcount = require("./wordcount");
const transformer = require("./transformer");
const slug = require("rehype-slug");
const pos = require("retext-pos");
const keywords = require("retext-keywords");
// const fs = require("fs");

const processor = unified()
  .use(parse)
  .use(
    text,
    unified()
      .use(latin)
      .use(pos)
      .use(keywords)
      .use(wordcount)
  )
  .use(slug)
  .use(transformer)
  .use(function(options) {
    this.Compiler = compiler;
    function compiler(tree) {
      return JSON.stringify(tree, null, 2);
    }
  });

module.exports = async function processEngine({ files, output, cwd }, extract) {
  let processed = [];
  try {
    for (const file of files) {
      const result = await processor.process(file);
      processed = processed.concat(result);
    }
    const wordcount = await processFiles(files, extract);
    return { wordcount };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

async function processFiles(files, extract) {
  let count = 0;
  for (const file of files) {
    if (Number.isInteger(file.data.wordcount)) {
      count = count + file.data.wordcount;
    }
  }
  for (const file of files) {
    const resource = Object.assign({}, file.data.resource, {
      url: file.data.resource.url + ".json",
      encodingFormat: "application/json"
    });
    file.data.book.wordCount = count;
    await extract(file, resource, {
      contentType: "application/json"
    });
  }
  return count;
}
