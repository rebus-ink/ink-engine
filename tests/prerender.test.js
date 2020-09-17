const tap = require("tap");
// const process = require("../");
const prerender = require("../src/prerender");
// const fs = require("fs");
const path = require("path");
// const os = require("os");

const book = require(path.join(
  __dirname,
  "fixtures/processed-epub/index.json"
));

tap.test("prerender", async test => {
  for (const resource of book.readingOrder) {
    const chapter = require(path.join(
      __dirname,
      "fixtures/processed-epub/",
      resource.url
    ));
    const processed = await prerender(chapter, {
      mediaBase: "/api/store/",
      linkBase: "/reader/id/storage/",
      annotations: [
        {
          id: "http://example.com/annotations2-inexact",
          type: "Annotation",
          motivation: "highlighting",
          created: "2015-10-13T13:00:00Z",
          body: [
            {
              type: "TextualBody",
              value: "\n\nj'adore !\n\n",
              format: "text/markdown",
              language: "fr",
              purpose: "commenting"
            }
          ],
          target: {
            source: "https://example.com/tests/fixtures/text-quote.input.html",
            styleClass: "Bookmarked",
            selector: {
              type: "TextQuoteSelector",
              prefix: "bogomips",
              exact: "quarry Bilbo captive",
              suffix: "bogomips"
            }
          }
        },
        {
          id: "http://example.com/annotations1-non-existent",
          type: "Annotation",
          motivation: "highlighting",
          created: "2015-10-13T13:00:00Z",
          body: [
            {
              type: "TextualBody",
              value: "<p>j'adore !</p>",
              format: "text/html",
              language: "fr",
              purpose: "commenting"
            }
          ],
          target: {
            source: "https://example.com/tests/fixtures/text-quote.input.html",
            styleClass: "Bookmarked",
            selector: {
              type: "TextQuoteSelector",
              exact: "gaudeamus igitur"
            }
          }
        }
      ]
    });
    test.matchSnapshot(processed, "prerender" + resource.url);
  }
});
