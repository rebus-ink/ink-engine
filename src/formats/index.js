const docx = require("./DocxProcess");
const epub = require("./EpubProcess");
const markup = require("./MarkupProcess");

module.exports = {
  "application/epub+zip": epub,
  epub: epub,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": docx,
  docx: docx,
  "text/html": markup,
  html: markup
};
