const size = require("unist-util-size");
const toString = require("nlcst-to-string");

function attacher(options) {
  return transformer;
  function transformer(node, file) {
    return count(node, file, options);
  }
}

module.exports = attacher;

function count(node, file) {
  const keywords = file.data.keywords.map(keyword =>
    toString(keyword.matches[0].node)
  );
  const keyphrases = file.data.keyphrases.map(phrase =>
    phrase.matches[0].nodes.map(value => toString(value)).join("")
  );
  file.data = Object.assign(
    {},
    file.data,
    {
      wordcount: size(node, "WordNode")
    },
    { keywords, keyphrases }
  );
}
