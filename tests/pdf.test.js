// This file needs to load the test pdf, import pdf.js and use it as an async iterator to get all of the vfiles, taking a snapshot of each.

const tap = require("tap");
const pdf = require("../src/formats/");
const fs = require("fs");
const path = require("path");

const pdfPath = path.join(__dirname, "fixtures/test-file.pdf");

tap.test("pdf process", async test => {
  const file = await fs.promises.readFile(pdfPath);
  for await (const vfile of pdf({
    data: file,
    filename: "test.pdf",
    mediaType: "pdf"
  })) {
    test.matchSnapshot(
      vfile.contents,
      "pdf file test-file.pdf contents" + vfile.path
    );
    test.matchSnapshot(vfile.path, "pdf file test-file.pdf path" + vfile.path);
  }
});
