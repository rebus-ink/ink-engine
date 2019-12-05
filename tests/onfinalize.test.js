const tap = require("tap");
const setup = require("../functions/on-finalize");
const fs = require("fs");
const path = require("path");
const os = require("os");

const epubPath = path.join(__dirname, "fixtures/test-epub.epub");
tap.cleanSnapshot = s => {
  const tempdir = os.tmpdir();
  const reg = new RegExp(`"${tempdir}[^"]+`, "g");
  return s.replace(reg, "");
};

tap.test("upload finalize", async test => {
  // Mocks
  const admin = {
    storage() {
      return {
        bucket() {
          return bucket;
        }
      };
    }
  };

  const bucket = {
    file(filename) {
      return {
        download({ destination }) {
          // copy test file to destination
          return fs.promises.copyFile(epubPath, destination);
        },
        save(contents, options) {
          test.matchSnapshot(contents, "epub finalize " + filename);
          test.matchSnapshot(options, "epub finalize options " + filename);
        }
      };
    }
  };
  const finalise = setup(admin, done);
  await finalise({
    name: "user/user-123/publications/test-1234/test-epub.epub",
    bucket: "test-bucket",
    contentType: "application/epub+zip"
  });
  function done(err, result) {
    test.notOk(err);
    test.matchSnapshot(result, "epub first result");
  }
});

tap.test("upload finalize errors", async test => {
  // Mocks
  const admin = {
    storage() {
      return {
        bucket() {
          return bucket;
        }
      };
    }
  };

  const bucket = {
    file(filename) {
      return {
        download({ destination }) {
          // copy test file to destination
          return Promise.resolve();
        },
        save(contents, options) {
          test.matchSnapshot(contents, "epub finalize " + filename);
          test.matchSnapshot(options, "epub finalize options " + filename);
        }
      };
    }
  };
  const finalise = setup(admin, done);
  await finalise({
    name: "user/user-123/publications/test-1234/test-epub.epub",
    bucket: "test-bucket",
    contentType: "application/epub+zip"
  });
  function done(err, result) {
    test.ok(err);
    test.notOk(result);
  }
});

const docxPath = path.join(__dirname, "fixtures/test.docx");

tap.test("upload finalize docx", async test => {
  // Mocks
  const admin = {
    storage() {
      return {
        bucket() {
          return bucket;
        }
      };
    }
  };

  const bucket = {
    file(filename) {
      return {
        download({ destination }) {
          // copy test file to destination
          return fs.promises.copyFile(docxPath, destination);
        },
        save(contents, options) {
          test.matchSnapshot(contents, "docx finalize " + filename);
          test.matchSnapshot(options, "docx finalize options " + filename);
        }
      };
    }
  };
  const finalise = setup(admin, done);
  await finalise({
    name: "user/user-123/publications/test-1234/test.docx",
    bucket: "test-bucket",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  function done(err, result) {
    test.notOk(err);
    test.matchSnapshot(result, "docx first result");
  }
});

tap.test("should not work without user id", async test => {
  const finalise = setup({}, done);
  await finalise({
    name: "publications/test-1234/test.docx",
    bucket: "test-bucket",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  function done(err, result) {
    test.ok(err);
    test.equals(err.message, "User id and pub id are required");
  }
});

tap.test("needs to be a known content type", async test => {
  const finalise = setup({}, done);
  await finalise({
    name: "user/user-123/publications/test-1234/test.docx",
    bucket: "test-bucket",
    contentType: "example-content-type/does-not-exist"
  });
  function done(err, result) {
    test.ok(err);
    test.equals(err.message, "Not a supported content type");
  }
});
