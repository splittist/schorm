/**
 * SCORM manifest (imsmanifest.xml) generation
 */

import { create } from 'xmlbuilder2';
import type { Course, Lesson } from './course-model.js';
import type { MediaFile } from './media.js';

export interface ManifestOptions {
  identifier: string;
  title: string;
  version: string;
  description?: string;
  organizations: Organization[];
  resources: Resource[];
}

export interface Organization {
  identifier: string;
  title: string;
  items: OrganizationItem[];
}

export interface OrganizationItem {
  identifier: string;
  title: string;
  identifierref?: string;
  items?: OrganizationItem[];
}

export interface Resource {
  identifier: string;
  type: string;
  href: string;
  scormType: string;
  files: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addItemsToOrganization(parentElement: any, items: OrganizationItem[]): void {
  for (const item of items) {
    const itemElement = parentElement.ele('item', {
      identifier: item.identifier,
      identifierref: item.identifierref,
    });
    itemElement.ele('title').txt(item.title).up();

    if (item.items && item.items.length > 0) {
      addItemsToOrganization(itemElement, item.items);
    }

    itemElement.up();
  }
}

export function generateManifest(options: ManifestOptions): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' });

  const manifest = doc.ele('manifest', {
    identifier: options.identifier,
    version: options.version,
    xmlns: 'http://www.imsglobal.org/xsd/imscp_v1p1',
    'xmlns:adlcp': 'http://www.adlnet.org/xsd/adlcp_v1p3',
    'xmlns:adlseq': 'http://www.adlnet.org/xsd/adlseq_v1p3',
    'xmlns:adlnav': 'http://www.adlnet.org/xsd/adlnav_v1p3',
    'xmlns:imsss': 'http://www.imsglobal.org/xsd/imsss',
  });

  // Metadata
  manifest
    .ele('metadata')
    .ele('schema')
    .txt('ADL SCORM')
    .up()
    .ele('schemaversion')
    .txt('2004 4th Edition')
    .up()
    .up();

  // Organizations
  const organizations = manifest.ele('organizations', {
    default: options.organizations[0]?.identifier || 'ORG-1',
  });

  for (const org of options.organizations) {
    const orgElement = organizations.ele('organization', {
      identifier: org.identifier,
    });
    orgElement.ele('title').txt(org.title).up();

    addItemsToOrganization(orgElement, org.items);
    orgElement.up();
  }

  organizations.up();

  // Resources
  const resources = manifest.ele('resources');

  for (const resource of options.resources) {
    const resourceElement = resources.ele('resource', {
      identifier: resource.identifier,
      type: resource.type,
      'adlcp:scormType': resource.scormType,
      href: resource.href,
    });

    for (const file of resource.files) {
      resourceElement.ele('file', { href: file }).up();
    }

    resourceElement.up();
  }

  resources.up();
  manifest.up();

  return doc.end({ prettyPrint: true });
}

export function buildManifestFromCourse(
  course: Course,
  lessons: Lesson[],
  mediaFiles: MediaFile[]
): string {
  // Create a map of lessons by ID for quick lookup
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  // Build organization items
  const orgItems: OrganizationItem[] = [];

  for (const module of course.modules) {
    const moduleItems: OrganizationItem[] = [];

    for (const itemId of module.items) {
      const lesson = lessonMap.get(itemId);
      if (lesson) {
        moduleItems.push({
          identifier: `ITEM-${itemId}`,
          title: lesson.title,
          identifierref: `RES-${itemId}`,
        });
      }
    }

    orgItems.push({
      identifier: `ITEM-${module.id}`,
      title: module.title,
      items: moduleItems,
    });
  }

  // Build resources
  const resources: Resource[] = [];
  const commonFiles = ['assets/schorm-runtime.js', 'assets/styles.css'];

  for (const lesson of lessons) {
    const files = [`${lesson.id}.html`, ...commonFiles];

    resources.push({
      identifier: `RES-${lesson.id}`,
      type: 'webcontent',
      scormType: 'sco',
      href: `${lesson.id}.html`,
      files,
    });
  }

  // Add media files to resources
  for (const mediaFile of mediaFiles) {
    const mediaPath = `media/${mediaFile.relativePath}`;
    // We can optionally add media files to existing resources or create separate resources
    // For now, we'll just ensure they're listed in at least one resource
    if (resources.length > 0 && !resources[0].files.includes(mediaPath)) {
      resources[0].files.push(mediaPath);
    }
  }

  const manifestOptions: ManifestOptions = {
    identifier: course.id || 'MANIFEST-001',
    title: course.title || 'Untitled Course',
    version: course.version || '1.0',
    description: course.metadata?.description,
    organizations: [
      {
        identifier: 'ORG-1',
        title: course.title || 'Untitled Course',
        items: orgItems,
      },
    ],
    resources,
  };

  return generateManifest(manifestOptions);
}
