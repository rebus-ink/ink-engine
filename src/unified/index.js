const engine = require("unified-engine");
const unified = require("unified");
const parse = require("./parse");
const stringify = require("rehype-stringify");
// const rehype2retext = require('rehype-retext')
// const english = require('retext-english')
// const pos = require('retext-pos')
// const keywords = require('retext-keywords')
const transformer = require("./transformer");
const slug = require("rehype-slug");
const fs = require("fs");

const processor = unified()
  .use(parse)
  // .use(
  //   rehype2retext,
  //   unified()
  //     .use(english)
  //     .use(pos)
  //     .use(keywords)
  // )
  .use(slug)
  .use(transformer)
  .use(stringify)
  .freeze();

module.exports = function processEngine({ files, output, cwd }, extract) {
  const promise = new Promise((resolve, reject) => {
    engine(
      {
        processor,
        files,
        cwd,
        output,
        treeOut: true
      },
      function(err, code, context) {
        if (err) reject(err);
        return processFiles(files, extract).then(() => {
          return resolve(context);
        });
      }
    );
  });
  return promise;
};

async function processFiles(files, extract) {
  for (const file of files) {
    await fs.promises.writeFile(file.basename, String(file));
    const resource = Object.assign({}, file.data.resource, {
      url: file.data.resource.url + ".json",
      encodingFormat: "application/json"
    });
    await extract(file, resource, {
      contentType: "application/json"
    });
  }
}
