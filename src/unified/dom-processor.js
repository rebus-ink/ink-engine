const unified = require("unified");
const parse = require("./dom-parse");
const transformer = require("./transformer");
const slug = require("rehype-slug");

module.exports = unified()
  .use(parse)
  .use(slug)
  .use(transformer)
  .use(function(options) {
    this.Compiler = compiler;
    function compiler(tree) {
      return tree;
    }
  });
