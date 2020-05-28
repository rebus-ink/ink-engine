const docx = require("./DocxProcess");
const epub = require("./EpubProcess");

module.exports = {
  "application/epub+zip": epub,
  epub: epub,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": docx,
  docx: docx
};
