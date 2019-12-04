const size = require("unist-util-size");

function attacher(options) {
  return transformer;
  function transformer(node, file) {
    return count(node, file, options);
  }
}

module.exports = attacher;

function count(node, file) {
  file.data = Object.assign({}, file.data, {
    wordcount: size(node, "WordNode")
  });
}
