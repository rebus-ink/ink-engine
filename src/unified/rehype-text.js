const toText = require("hast-util-to-text");
module.exports = rehypeText;

function rehypeText(destination) {
  return bridge(destination);
}

function bridge(destination) {
  return transformer;
  function transformer(node, file, next) {
    const text = toText(node);

    const retextNode = destination.parse(text, file);
    destination.run(retextNode, file, done);
    function done(err) {
      next(err);
    }
  }
}
