const unified = require("unified");
const transformer = require("./transformer");
const html = require("rehype-stringify");
const annotate = require("rehype-annotate");

module.exports = function getProcessor(options) {
  const { annotations = [], documentURL } = options;
  return unified()
    .use(annotate, { annotations, url: documentURL, stimulus: true })
    .use(transformer, options)
    .use(html);
};
