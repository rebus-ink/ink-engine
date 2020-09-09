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
      tree.data.headings = processHeadings(tree.data.headings);
      return tree;
    }
  });

function processHeadings(headings) {
  return headings.reduce(headingReducer, []);
}

function headingReducer(prev, current, index, headings) {
  if (current.level === 1) {
    return prev.concat(current);
  } else if (current.level === 2 && prev[prev.length - 1]) {
    const outline = prev[prev.length - 1];
    outline.children = [].concat(outline.children).concat(current);
    return prev;
  } else if (
    current.level === 3 &&
    prev[prev.length - 1] &&
    prev[prev.length - 1].children.length !== 0
  ) {
    const parent = prev[prev.length - 1];
    const outline = parent.children[parent.length - 1];
    outline.children = [].concat(outline.children).concat(current);
    return prev;
  } else {
    return prev;
  }
}
