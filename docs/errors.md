# Error Codes Reference

This document describes all error codes that can be produced by `schorm build` and other commands.

## Error Code Format

Error codes follow the pattern: `E-<CATEGORY>-<SPECIFIC>`

- `E-` prefix indicates an error (vs `W-` for warnings)
- `<CATEGORY>` indicates which part of the build process failed
- `<SPECIFIC>` describes the specific failure

## Build Error Codes

### Configuration Errors

#### E-CONFIG-LOAD
**Description**: Failed to load the configuration file (`schorm.config.yml`).

**Common Causes**:
- File does not exist
- File contains invalid YAML syntax
- File is not readable

**Example**:
```
[E-CONFIG-LOAD] schorm.config.yml
  Failed to load configuration file: Config file not found: /path/to/schorm.config.yml
```

**Resolution**:
- Ensure `schorm.config.yml` exists in your project root
- Validate YAML syntax
- Check file permissions

---

### Course Model Errors

#### E-COURSE-LOAD
**Description**: Failed to load the course definition file (`course.yml`).

**Common Causes**:
- File does not exist
- File contains invalid YAML syntax
- Missing required fields (`id`, `title`)
- File is not readable

**Example**:
```
[E-COURSE-LOAD] course.yml
  Failed to load course.yml: Course file not found: /path/to/course.yml
```

**Resolution**:
- Ensure `course.yml` exists in your project root
- Validate that it contains required fields: `id`, `title`, `modules`
- Check YAML syntax

---

### Lesson Parsing Errors

#### E-LESSON-PARSE
**Description**: Failed to parse a lesson file.

**Common Causes**:
- Missing required frontmatter fields (`id`, `title`, `module`)
- Invalid frontmatter format
- Module reference doesn't exist
- Invalid lesson ID format (must be alphanumeric with hyphens/underscores)
- Markdown rendering error

**Example**:
```
[E-LESSON-PARSE] content/m1/intro.md
  Failed to parse lesson: content/m1/intro.md: frontmatter missing required field "id"
```

**Resolution**:
- Ensure frontmatter includes: `id`, `title`, `module`
- Verify the `module` field references an existing module in `course.yml`
- Use valid ID format: `[a-zA-Z0-9_-]+`
- Check for YAML syntax errors in frontmatter

**Required Frontmatter Fields**:
```yaml
---
id: lesson-id           # Required: unique identifier
title: Lesson Title     # Required: human-readable title
module: module-id       # Required: reference to parent module
type: lesson            # Optional: must be "lesson" if present
order: 1                # Optional: display order
duration: 30            # Optional: estimated duration in minutes
objectives:             # Optional: learning objectives
  - Objective 1
  - Objective 2
---
```

---

### Template Errors

#### E-TEMPLATE-LOAD
**Description**: Failed to load a template file or partials.

**Common Causes**:
- Template file doesn't exist
- Template directory is missing
- File permissions issue

**Example**:
```
[E-TEMPLATE-LOAD] theme/layouts/lesson.html
  Failed to load lesson template: Template file not found: /path/to/theme/layouts/lesson.html
```

**Resolution**:
- Verify theme directory structure
- Ensure template files exist
- Check file permissions

---

#### E-TEMPLATE-RENDER
**Description**: Failed to render a lesson using the template engine.

**Common Causes**:
- Invalid Handlebars syntax in template
- Missing partial reference
- Invalid data passed to template
- Handlebars helper error

**Example**:
```
[E-TEMPLATE-RENDER] (unknown file)
  Failed to render lesson template: Parse error on line 5
  SCO: m1-intro
  Module: m1
```

**Resolution**:
- Check template syntax
- Verify all partials are defined
- Review Handlebars helper usage
- Check lesson data structure

---

### Media Errors

#### E-MEDIA-PROCESS
**Description**: Failed to process or copy media files.

**Common Causes**:
- Media directory is not readable
- Permission issues copying files
- Disk space issues

**Example**:
```
[E-MEDIA-PROCESS] media
  Failed to process media files: EACCES: permission denied
```

**Resolution**:
- Check media directory permissions
- Ensure sufficient disk space
- Verify media files are readable

---

### Manifest Errors

#### E-MANIFEST-GENERATE
**Description**: Failed to generate the SCORM manifest file (`imsmanifest.xml`).

**Common Causes**:
- Invalid course structure
- Missing required lesson data
- File write permissions

**Example**:
```
[E-MANIFEST-GENERATE] imsmanifest.xml
  Failed to generate SCORM manifest: Cannot read property 'id' of undefined
```

**Resolution**:
- Verify all lessons have required fields
- Check course structure in `course.yml`
- Ensure output directory is writable

---

### Build Setup Errors

#### E-BUILD-DIR-SETUP
**Description**: Failed to create or clear the build output directory.

**Common Causes**:
- Permission denied
- Disk space issues
- Directory is locked by another process

**Example**:
```
[E-BUILD-DIR-SETUP] /path/to/build
  Failed to set up build directory: EACCES: permission denied
```

**Resolution**:
- Check directory permissions
- Ensure sufficient disk space
- Close any programs accessing the build directory

---

### Assets Errors

#### E-ASSETS-COPY
**Description**: Failed to copy theme assets to build directory.

**Common Causes**:
- Assets directory doesn't exist
- Permission issues
- Disk space issues

**Example**:
```
[E-ASSETS-COPY] theme/assets
  Failed to copy theme assets: ENOENT: no such file or directory
```

**Resolution**:
- Verify assets directory exists in theme
- Check file permissions
- Ensure sufficient disk space

---

### General Build Errors

#### E-BUILD-FAILED
**Description**: Build failed with an unexpected error not caught by specific handlers.

**Common Causes**:
- Unexpected runtime error
- System error
- Bug in schorm

**Example**:
```
[E-BUILD-FAILED] (unknown file)
  Build failed with unexpected error: Unexpected token in JSON
```

**Resolution**:
- Review the full error message
- Check for system issues
- Report as a bug if error persists

---

## Using JSON Mode

You can get machine-readable error output by adding the `--json` flag:

```bash
schorm build --json
```

This outputs a structured JSON object:

```json
{
  "ok": false,
  "errors": [
    {
      "code": "E-LESSON-PARSE",
      "message": "Failed to parse lesson: frontmatter missing required field \"id\"",
      "severity": "error",
      "file": "content/m1/intro.md",
      "originatingStep": "markdown"
    }
  ],
  "warnings": []
}
```

## Exit Codes

- `0`: Build succeeded
- `1`: Build failed with errors

---

## Related Documentation

- [Validation Error Codes](./validation-errors.md) - For `schorm validate` command
- [Course Structure](./course-structure.md) - Course and module organization
- [Frontmatter Schema](./frontmatter.md) - Lesson frontmatter requirements
