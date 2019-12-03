const { JSDOM } = require("jsdom");
const fromDOM = require("hast-util-from-dom");

module.exports = parse;

function parse(options) {
  function parser(doc, file) {
    let dom;
    try {
      dom = new JSDOM(String(file), {
        contentType: file.data.resource.encodingFormat
      });
    } catch (err) {
      dom = new JSDOM(String(file), {
        contentType: "text/html"
      });
    }
    const window = dom.window;
    const document = window.document;
    return fromDOM(document);
  }
  this.Parser = parser;
}
