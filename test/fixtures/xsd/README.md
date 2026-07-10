# SCORM 2004 4th Edition XSDs (optional)

`test/core/manifest-conformance.test.ts` validates generated manifests with
`xmllint --schema` **when the SCORM 2004 4th Edition schema set is present in
this directory**; otherwise it falls back to well-formedness plus structural
assertions and skips the XSD step.

The schema hosts (imsglobal.org / adlnet.gov) are not reachable from the
sandboxed development environment, so the files are not vendored. To enable
full conformance checking, place these files here (they ship in the ADL SCORM
2004 4th Edition Content Examples / Test Suite bundle and are also served at
the namespace URLs):

- `imscp_v1p1.xsd` — IMS Content Packaging (root schema; the test passes this
  file to xmllint)
- `adlcp_v1p3.xsd` — ADL content packaging extensions
- `adlseq_v1p3.xsd` — ADL sequencing extensions
- `adlnav_v1p3.xsd` — ADL navigation
- `imsss_v1p0.xsd` (+ its `imsss_v1p0*.xsd` includes) — IMS Simple Sequencing
- `lom.xsd` / `xml.xsd` — only if referenced by your copies of the above

`xmllint` must be installed (`apt-get install libxml2-utils`); CI installs it.
