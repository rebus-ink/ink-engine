const fromDOM = require("hast-util-from-dom");

module.exports = parse;

function parse(options) {
  function parser(doc, document) {
    return fromDOM(document);
  }
  this.Parser = parser;
}
