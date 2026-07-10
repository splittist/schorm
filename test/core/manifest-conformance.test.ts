/**
 * Manifest conformance tests
 *
 * Pins the structure of generated imsmanifest.xml files: well-formedness
 * (xmllint), reference integrity (every identifierref resolves), and the
 * resource/file/dependency shape introduced for per-SCO media association.
 * When the SCORM 2004 4th Ed. XSDs are present in test/fixtures/xsd/ (see the
 * README there), the manifests are additionally schema-validated.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { convert } from 'xmlbuilder2';
import { buildManifestFromCourse } from '../../src/core/manifest.js';
import type { Course, Lesson } from '../../src/core/course-model.js';
import type { Quiz } from '../../src/core/quiz-model.js';
import type { MediaFile } from '../../src/core/media.js';

function hasXmllint(): boolean {
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const XSD_ROOT = path.join(process.cwd(), 'test', 'fixtures', 'xsd', 'imscp_v1p1.xsd');
const xmllintAvailable = hasXmllint();
const xsdAvailable = fs.existsSync(XSD_ROOT);

function makeLesson(id: string, module: string, media?: Lesson['media']): Lesson {
  return {
    type: 'lesson',
    id,
    title: `Lesson ${id}`,
    module,
    content: '<p>content</p>',
    metadata: {},
    media,
  };
}

const course: Course = {
  id: 'conformance-course',
  title: 'Conformance Course',
  version: '1.0.0',
  metadata: { description: 'Course used by manifest conformance tests' },
  modules: [
    {
      id: 'm1',
      title: 'Module 1',
      items: ['intro', 'deep-dive', 'checkpoint'],
      sequencing: {
        mode: 'linear',
        gate: { quiz: 'checkpoint' },
      },
    },
  ],
};

const lessons: Lesson[] = [
  makeLesson('intro', 'm1', [
    { id: 'audio-narration-0', type: 'audio', src: 'media/m1/narration.mp3' },
  ]),
  makeLesson('deep-dive', 'm1'),
];

const quizzes: Quiz[] = [
  {
    id: 'checkpoint',
    module: 'm1',
    title: 'Checkpoint Quiz',
    passing_score: 0.7,
    questions: [
      {
        id: 'q1',
        type: 'true-false',
        prompt: 'Is this a test?',
        correct: true,
      },
    ],
  },
];

const mediaFiles: MediaFile[] = [
  {
    sourcePath: '/project/media/m1/narration.mp3',
    relativePath: 'm1/narration.mp3',
    size: 128,
    mimeType: '',
  },
  {
    sourcePath: '/project/media/m1/orphan.png',
    relativePath: 'm1/orphan.png',
    size: 64,
    mimeType: '',
  },
];

const manifestXml = buildManifestFromCourse(course, lessons, mediaFiles, quizzes);

// ---------------------------------------------------------------------------
// Helpers over the parsed manifest
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const parsed = convert(manifestXml, { format: 'object' }) as any;
const manifest = parsed.manifest;
const allResources = asArray(manifest.resources.resource);

function collectItems(node: any): any[] {
  const items = asArray(node.item);
  return items.concat(items.flatMap((i: any) => collectItems(i)));
}

const organization = asArray(manifest.organizations.organization)[0];
const allItems = collectItems(organization);
const resourceIds = new Set(allResources.map((r: any) => r['@identifier']));

describe('generated manifest structure', () => {
  it('is well-formed XML (xmllint)', () => {
    if (!xmllintAvailable) return; // covered by the parse below either way
    const tmp = path.join(os.tmpdir(), `schorm-manifest-${process.pid}.xml`);
    fs.writeFileSync(tmp, manifestXml);
    try {
      execFileSync('xmllint', ['--noout', tmp], { stdio: 'pipe' });
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('validates against the SCORM 2004 XSDs when they are vendored', () => {
    if (!xmllintAvailable || !xsdAvailable) {
      // See test/fixtures/xsd/README.md - schemas cannot be fetched from the
      // sandboxed environment; the test upgrades automatically when present
      return;
    }
    const tmp = path.join(os.tmpdir(), `schorm-manifest-xsd-${process.pid}.xml`);
    fs.writeFileSync(tmp, manifestXml);
    try {
      execFileSync('xmllint', ['--noout', '--schema', XSD_ROOT, tmp], { stdio: 'pipe' });
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('declares the SCORM 2004 4th Edition metadata', () => {
    expect(manifest.metadata.schema).toBe('ADL SCORM');
    expect(manifest.metadata.schemaversion).toBe('2004 4th Edition');
  });

  it('resolves every item identifierref to a resource', () => {
    const refs = allItems
      .map((i: any) => i['@identifierref'])
      .filter((ref: string | undefined) => ref !== undefined);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(resourceIds, `unresolved identifierref ${ref}`).toContain(ref);
    }
  });

  it('resolves every dependency identifierref to a resource', () => {
    let dependencyCount = 0;
    for (const resource of allResources) {
      for (const dep of asArray(resource.dependency) as any[]) {
        dependencyCount++;
        expect(resourceIds).toContain(dep['@identifierref']);
      }
    }
    expect(dependencyCount).toBeGreaterThan(0);
  });

  it('lists each resource href among its own files', () => {
    for (const resource of allResources) {
      const href = resource['@href'];
      if (href === undefined) continue;
      const files = asArray(resource.file).map((f: any) => f['@href']);
      expect(files, `resource ${resource['@identifier']}`).toContain(href);
    }
  });

  it('declares lesson media on the lesson resource and shared assets once', () => {
    const byId = new Map(allResources.map((r: any) => [r['@identifier'], r]));

    const intro = byId.get('RES-intro');
    const introFiles = asArray(intro.file).map((f: any) => f['@href']);
    expect(introFiles).toContain('media/m1/narration.mp3');

    const common = byId.get('RES-common-assets');
    expect(common['@adlcp:scormType']).toBe('asset');
    const commonFiles = asArray(common.file).map((f: any) => f['@href']);
    expect(commonFiles).toContain('assets/schorm-runtime.js');
    expect(commonFiles).toContain('assets/styles.css');

    // The runtime must be declared exactly once across the whole manifest
    const runtimeDeclarations = allResources
      .flatMap((r: any) => asArray(r.file))
      .filter((f: any) => f['@href'] === 'assets/schorm-runtime.js');
    expect(runtimeDeclarations).toHaveLength(1);

    // Unreferenced media falls back to the index resource
    const index = byId.get('RES-index');
    const indexFiles = asArray(index.file).map((f: any) => f['@href']);
    expect(indexFiles).toContain('media/m1/orphan.png');
    expect(introFiles).not.toContain('media/m1/orphan.png');
  });

  it('declares every packaged media file exactly once', () => {
    for (const mediaFile of mediaFiles) {
      const declarations = allResources
        .flatMap((r: any) => asArray(r.file))
        .filter((f: any) => f['@href'] === `media/${mediaFile.relativePath}`);
      expect(declarations, mediaFile.relativePath).toHaveLength(1);
    }
  });

  it("uses the gate quiz's own passing_score as the objective threshold", () => {
    expect(manifestXml).toContain('<imsss:minNormalizedMeasure>0.7</imsss:minNormalizedMeasure>');
  });

  it('marks lessons and quizzes as SCOs', () => {
    for (const id of ['RES-intro', 'RES-deep-dive', 'RES-checkpoint']) {
      const resource = allResources.find((r: any) => r['@identifier'] === id);
      expect(resource, id).toBeDefined();
      expect(resource['@adlcp:scormType']).toBe('sco');
    }
  });
});
