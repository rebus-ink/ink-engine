const tap = require("tap");
const docx = require("../src/formats/");
const path = require("path");
const os = require("os");

tap.cleanSnapshot = s => {
  const tempdir = os.tmpdir();
  const reg = new RegExp(`"${tempdir}[^"]+"`, "g");
  return s.replace(reg, '"TMPDIR"');
};

const docxPath = path.join(__dirname, "fixtures/test.docx");

tap.skip("thumbnails process", async test => {
  for await (const vfile of docx({
    filename: docxPath,
    mediaType: "docx",
    thumbnails: true
  })) {
    if (vfile.contentType && vfile.contentType.includes("image")) {
      test.ok(vfile);
      test.ok(vfile.path === "1.png" || vfile.path === "thumbnails/1.png.jpg");
    }
  }
});
