const unified = require("unified");
const parse = require("./parse");
const text = require("./rehype-text");
const latin = require("retext-latin");
const wordcount = require("./wordcount");
const transformer = require("./transformer");
const slug = require("rehype-slug");
const pos = require("retext-pos");
const keywords = require("retext-keywords");

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

module.exports = processor;
