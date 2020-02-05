const engine = require("unified-engine");
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
  .freeze();

module.exports = function processEngine({ files, output, cwd }, extract) {
  const promise = new Promise((resolve, reject) => {
    engine(
      {
        processor,
        files,
        cwd,
        output,
        silent: true,
        treeOut: true
      },
      function(err, code, context) {
        if (code === 1) {
          return reject(new Error("Processing failed"))
        } else if (err) {
          return reject(err)
        };
        return processFiles(context.files, extract).then(wordcount => {
          context.wordcount = wordcount;
          return resolve(context);
        });
      }
    );
  });
  return promise;
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
