/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
"use strict";
exports[
  `tests/unified.test.js TAP parse html for processor > parse xhtml, invalid 1`
] = `
Object {
  "children": Array [
    Object {
      "type": "comment",
      "value": "?xml version=\\"1.0\\" encoding=\\"utf-8\\"?",
    },
    Object {
      "name": "html",
      "public": null,
      "system": null,
      "type": "doctype",
    },
    Object {
      "children": Array [
        Object {
          "children": Array [
            Object {
              "type": "text",
              "value": "\\n  ",
            },
            Object {
              "children": Array [
                Object {
                  "type": "text",
                  "value": "body {position: fixed; background-color: red;}",
                },
              ],
              "properties": Object {},
              "tagName": "style",
              "type": "element",
            },
            Object {
              "type": "text",
              "value": "\\n  ",
            },
          ],
          "properties": Object {},
          "tagName": "head",
          "type": "element",
        },
        Object {
          "children": Array [
            Object {
              "type": "text",
              "value": "\\n  ",
            },
            Object {
              "children": Array [],
              "properties": Object {},
              "tagName": "br",
              "type": "element",
            },
            Object {
              "type": "text",
              "value": "\\n  ",
            },
            Object {
              "children": Array [
                Object {
                  "type": "text",
                  "value": "Test",
                },
              ],
              "properties": Object {},
              "tagName": "h1",
              "type": "element",
            },
            Object {
              "type": "text",
              "value": "\\n  ",
            },
            Object {
              "children": Array [
                Object {
                  "children": Array [],
                  "properties": Object {
                    "src": "/image.png",
                  },
                  "tagName": "img",
                  "type": "element",
                },
              ],
              "properties": Object {},
              "tagName": "p",
              "type": "element",
            },
            Object {
              "type": "text",
              "value": "\\n  ",
            },
          ],
          "properties": Object {},
          "tagName": "body",
          "type": "element",
        },
      ],
      "properties": Object {
        "lang": "en",
        "xmlLang": "en",
        "xmlns": "http://www.w3.org/1999/xhtml",
        "xmlns:epub": "http://www.idpf.org/2007/ops",
      },
      "tagName": "html",
      "type": "element",
    },
  ],
  "type": "root",
}
`;
