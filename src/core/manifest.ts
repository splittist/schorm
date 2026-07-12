/**
 * SCORM manifest (imsmanifest.xml) generation
 */

import { create } from 'xmlbuilder2';
import type { BranchCondition, BranchRoute, Course, Lesson, Module } from './course-model.js';
import type { GeneratedSequencing } from './scenario-builder.js';
import type { MediaFile } from './media.js';
import type { Quiz } from './quiz-model.js';
import { DEFAULT_PASSING_SCORE } from './quiz-model.js';

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
  sequencing?: OrganizationSequencing;
}

/**
 * Sequencing configuration for organization level
 */
export interface OrganizationSequencing {
  controlMode?: {
    flow?: boolean;
    choice?: boolean;
    forwardOnly?: boolean;
  };
}

export interface OrganizationItem {
  identifier: string;
  title: string;
  identifierref?: string;
  items?: OrganizationItem[];
  sequencing?: ItemSequencing;
}

/**
 * Sequencing configuration for individual items
 */
export interface ItemSequencing {
  controlMode?: {
    flow?: boolean;
    choice?: boolean;
    forwardOnly?: boolean;
  };
  objectives?: SequencingObjective[];
  preconditions?: SequencingPrecondition[];
  postconditions?: SequencingPostcondition[];
}

/**
 * SCORM sequencing objective
 */
export interface SequencingObjective {
  objectiveID: string;
  isPrimary?: boolean;
  satisfiedByMeasure?: boolean;
  minNormalizedMeasure?: number;
  mapInfo?: ObjectiveMapInfo[];
}

/**
 * Objective mapping information for global objectives
 */
export interface ObjectiveMapInfo {
  targetObjectiveID: string;
  readSatisfiedStatus?: boolean;
  writeSatisfiedStatus?: boolean;
  readNormalizedMeasure?: boolean;
  writeNormalizedMeasure?: boolean;
}

/**
 * SCORM sequencing precondition rule
 */
export interface SequencingPrecondition {
  ruleConditions: {
    objectiveID?: string;
    condition:
      | 'satisfied'
      | 'objectiveStatusKnown'
      | 'objectiveMeasureKnown'
      | 'completed'
      | 'activityProgressKnown'
      | 'attempted'
      | 'attemptLimitExceeded'
      | 'timeLimitExceeded'
      | 'always';
    operator?: 'not' | 'noOp';
  }[];
  ruleAction: 'skip' | 'disabled' | 'hiddenFromChoice' | 'stopForwardTraversal';
  conditionCombination?: 'all' | 'any';
}

export interface SequencingPostcondition {
  ruleConditions: {
    objectiveID?: string;
    condition:
      | 'satisfied'
      | 'objectiveStatusKnown'
      | 'objectiveMeasureKnown'
      | 'completed'
      | 'activityProgressKnown'
      | 'attempted'
      | 'attemptLimitExceeded'
      | 'timeLimitExceeded'
      | 'always';
    operator?: 'not' | 'noOp';
  }[];
  ruleAction:
    | { action: 'exitAll' | 'exitParent' | 'continue' | 'previous' | 'retry' | 'retryAll' }
    | { action: 'jump'; target: string };
  conditionCombination?: 'all' | 'any';
}

export interface Resource {
  identifier: string;
  type: string;
  href?: string;
  scormType: string;
  files: string[];
  /** Identifiers of resources this resource depends on (emitted as <dependency>) */
  dependencies?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addSequencingToElement(
  element: any,
  sequencing: ItemSequencing | OrganizationSequencing
): void {
  const seqElement = element.ele('imsss:sequencing');

  // Add control mode if specified
  if (sequencing.controlMode) {
    const controlAttrs: Record<string, string> = {};
    if (sequencing.controlMode.flow !== undefined) {
      controlAttrs.flow = sequencing.controlMode.flow ? 'true' : 'false';
    }
    if (sequencing.controlMode.choice !== undefined) {
      controlAttrs.choice = sequencing.controlMode.choice ? 'true' : 'false';
    }
    if (sequencing.controlMode.forwardOnly !== undefined) {
      controlAttrs.forwardOnly = sequencing.controlMode.forwardOnly ? 'true' : 'false';
    }
    seqElement.ele('imsss:controlMode', controlAttrs).up();
  }

  // Add objectives if specified (only for ItemSequencing)
  const itemSeq = sequencing as ItemSequencing;
  if (itemSeq.objectives && itemSeq.objectives.length > 0) {
    const objsElement = seqElement.ele('imsss:objectives');

    for (const obj of itemSeq.objectives) {
      const objAttrs: Record<string, string> = {
        objectiveID: obj.objectiveID,
      };

      const tagName = obj.isPrimary ? 'imsss:primaryObjective' : 'imsss:objective';
      const objElement = objsElement.ele(tagName, objAttrs);

      if (obj.satisfiedByMeasure !== undefined) {
        objElement.att('satisfiedByMeasure', obj.satisfiedByMeasure ? 'true' : 'false');
      }
      if (obj.minNormalizedMeasure !== undefined) {
        objElement.ele('imsss:minNormalizedMeasure').txt(obj.minNormalizedMeasure.toString()).up();
      }

      // Add objective map info if specified
      if (obj.mapInfo && obj.mapInfo.length > 0) {
        for (const map of obj.mapInfo) {
          const mapAttrs: Record<string, string> = {
            targetObjectiveID: map.targetObjectiveID,
          };
          if (map.readSatisfiedStatus !== undefined) {
            mapAttrs.readSatisfiedStatus = map.readSatisfiedStatus ? 'true' : 'false';
          }
          if (map.writeSatisfiedStatus !== undefined) {
            mapAttrs.writeSatisfiedStatus = map.writeSatisfiedStatus ? 'true' : 'false';
          }
          if (map.readNormalizedMeasure !== undefined) {
            mapAttrs.readNormalizedMeasure = map.readNormalizedMeasure ? 'true' : 'false';
          }
          if (map.writeNormalizedMeasure !== undefined) {
            mapAttrs.writeNormalizedMeasure = map.writeNormalizedMeasure ? 'true' : 'false';
          }
          objElement.ele('imsss:mapInfo', mapAttrs).up();
        }
      }

      objElement.up();
    }

    objsElement.up();
  }

  const hasPreconditions = itemSeq.preconditions && itemSeq.preconditions.length > 0;
  const hasPostconditions = itemSeq.postconditions && itemSeq.postconditions.length > 0;

  // Add sequencing rules (pre/post conditions)
  if (hasPreconditions || hasPostconditions) {
    const rulesElement = seqElement.ele('imsss:sequencingRules');

    if (hasPreconditions) {
      for (const precond of itemSeq.preconditions!) {
        const preCondRuleElement = rulesElement.ele('imsss:preConditionRule');

        const conditionsAttrs: Record<string, string> = {};
        if (precond.conditionCombination) {
          conditionsAttrs.conditionCombination = precond.conditionCombination;
        }
        const ruleConditionsElement = preCondRuleElement.ele(
          'imsss:ruleConditions',
          conditionsAttrs
        );

        for (const cond of precond.ruleConditions) {
          const condAttrs: Record<string, string> = {
            condition: cond.condition,
          };
          if (cond.objectiveID) {
            condAttrs.referencedObjective = cond.objectiveID;
          }
          if (cond.operator) {
            condAttrs.operator = cond.operator;
          }
          ruleConditionsElement.ele('imsss:ruleCondition', condAttrs).up();
        }

        ruleConditionsElement.up();

        preCondRuleElement.ele('imsss:ruleAction', { action: precond.ruleAction }).up();
        preCondRuleElement.up();
      }
    }

    if (hasPostconditions) {
      for (const postcond of itemSeq.postconditions!) {
        const postCondRuleElement = rulesElement.ele('imsss:postConditionRule');

        const conditionsAttrs: Record<string, string> = {};
        if (postcond.conditionCombination) {
          conditionsAttrs.conditionCombination = postcond.conditionCombination;
        }
        const ruleConditionsElement = postCondRuleElement.ele(
          'imsss:ruleConditions',
          conditionsAttrs
        );

        for (const cond of postcond.ruleConditions) {
          const condAttrs: Record<string, string> = {
            condition: cond.condition,
          };
          if (cond.objectiveID) {
            condAttrs.referencedObjective = cond.objectiveID;
          }
          if (cond.operator) {
            condAttrs.operator = cond.operator;
          }
          ruleConditionsElement.ele('imsss:ruleCondition', condAttrs).up();
        }

        ruleConditionsElement.up();

        const actionAttrs: Record<string, string> = { action: postcond.ruleAction.action };
        if (postcond.ruleAction.action === 'jump') {
          actionAttrs.target = postcond.ruleAction.target;
        }
        postCondRuleElement.ele('imsss:ruleAction', actionAttrs).up();
        postCondRuleElement.up();
      }
    }

    rulesElement.up();
  }

  seqElement.up();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addItemsToOrganization(parentElement: any, items: OrganizationItem[]): void {
  for (const item of items) {
    const itemElement = parentElement.ele('item', {
      identifier: item.identifier,
      identifierref: item.identifierref,
    });
    itemElement.ele('title').txt(item.title).up();

    // Add sequencing if specified
    if (item.sequencing) {
      addSequencingToElement(itemElement, item.sequencing);
    }

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

    // Add organization-level sequencing if specified
    if (org.sequencing) {
      addSequencingToElement(orgElement, org.sequencing);
    }

    addItemsToOrganization(orgElement, org.items);
    orgElement.up();
  }

  organizations.up();

  // Resources
  const resources = manifest.ele('resources');

  for (const resource of options.resources) {
    const attributes: Record<string, string> = {
      identifier: resource.identifier,
      type: resource.type,
      'adlcp:scormType': resource.scormType,
    };
    if (resource.href) {
      attributes.href = resource.href;
    }
    const resourceElement = resources.ele('resource', attributes);

    for (const file of resource.files) {
      resourceElement.ele('file', { href: file }).up();
    }

    // Per IMS content packaging, <dependency> elements follow the <file> list
    for (const dependency of resource.dependencies ?? []) {
      resourceElement.ele('dependency', { identifierref: dependency }).up();
    }

    resourceElement.up();
  }

  resources.up();
  manifest.up();

  return doc.end({ prettyPrint: true });
}

/**
 * Build sequencing configuration for a module item based on module sequencing settings
 */
function buildItemSequencing(
  module: Module,
  itemId: string,
  itemIndex: number,
  _isQuiz: boolean,
  passingScore?: number
): ItemSequencing | undefined {
  const sequencing = module.sequencing;
  if (!sequencing) {
    return undefined;
  }

  const itemSeq: ItemSequencing = {};

  const ensureObjective = (localObjectiveId: string, globalObjectiveId: string): void => {
    itemSeq.objectives = itemSeq.objectives ?? [];
    if (!itemSeq.objectives.some((o) => o.objectiveID === localObjectiveId)) {
      itemSeq.objectives.push({
        objectiveID: localObjectiveId,
        isPrimary: false,
        mapInfo: [
          {
            targetObjectiveID: globalObjectiveId,
            readSatisfiedStatus: true,
            writeSatisfiedStatus: false,
            readNormalizedMeasure: true,
            writeNormalizedMeasure: false,
          },
        ],
      });
    }
  };

  const addBranchingRules = (): void => {
    if (!sequencing.choices || sequencing.choices.length === 0) {
      return;
    }

    const relevantChoices = sequencing.choices.filter((choice) => choice.from === itemId);
    if (relevantChoices.length === 0) {
      return;
    }

    itemSeq.controlMode = itemSeq.controlMode ?? {};
    if (itemSeq.controlMode.choice === undefined) {
      itemSeq.controlMode.choice = true;
    }
    if (itemSeq.controlMode.flow === undefined) {
      itemSeq.controlMode.flow = true;
    }

    const sanitize = (value: string): string => value.replace(/[^a-zA-Z0-9_-]+/g, '-');

    const routeConditionsToRules = (
      route: BranchRoute
    ): SequencingPostcondition['ruleConditions'] => {
      const conditions: BranchCondition[] = route.conditions ?? [];
      if (route.condition) {
        conditions.push(route.condition);
      }

      if (conditions.length === 0) {
        return [
          {
            condition: 'always',
          },
        ];
      }

      return conditions.map((cond) => {
        const comparator = cond.equals
          ? `eq-${cond.equals}`
          : cond.notEquals
            ? `neq-${cond.notEquals}`
            : cond.in
              ? `in-${(cond.in as unknown[]).map(String).join('-')}`
              : cond.notIn
                ? `nin-${(cond.notIn as unknown[]).map(String).join('-')}`
                : 'condition';
        const localObjectiveId = `local-${itemId}-${sanitize(cond.variable)}-${sanitize(comparator)}`;
        const globalObjectiveId = `branch-${module.id}-${sanitize(cond.variable)}-${sanitize(comparator)}`;

        ensureObjective(localObjectiveId, globalObjectiveId);

        return {
          objectiveID: localObjectiveId,
          condition: 'satisfied',
        } as const;
      });
    };

    const postconditions: SequencingPostcondition[] = itemSeq.postconditions ?? [];

    for (const choice of relevantChoices) {
      for (const route of choice.routes) {
        const ruleConditions = routeConditionsToRules(route as never);
        const rule: SequencingPostcondition = {
          ruleConditions,
          conditionCombination: ruleConditions.length > 1 ? 'all' : undefined,
          ruleAction: route.end
            ? { action: 'exitAll' }
            : { action: 'jump', target: route.to ? `ITEM-${route.to}` : '' },
        };

        postconditions.push(rule);
      }
    }

    if (postconditions.length > 0) {
      itemSeq.postconditions = postconditions;
    }
  };

  // For linear mode, items can flow but not go backward
  if (sequencing.mode === 'linear') {
    itemSeq.controlMode = {
      flow: true,
      choice: true,
      forwardOnly: true,
    };
  }

  // Handle quiz-gated sequencing
  if (sequencing.gate) {
    const gateQuizId = sequencing.gate.quiz;
    const gateQuizIndex = module.items.indexOf(gateQuizId);

    // If this item is the gate quiz, it needs to write to the global objective
    if (itemId === gateQuizId) {
      const globalObjectiveId = `${module.id}-gate-passed`;
      // Use the quiz's own passing_score so the gate threshold matches what
      // the runtime reports as a pass
      itemSeq.objectives = [
        {
          objectiveID: `local-${itemId}-passed`,
          isPrimary: true,
          satisfiedByMeasure: true,
          minNormalizedMeasure: passingScore ?? DEFAULT_PASSING_SCORE,
          mapInfo: [
            {
              targetObjectiveID: globalObjectiveId,
              readSatisfiedStatus: false,
              writeSatisfiedStatus: true,
              readNormalizedMeasure: false,
              writeNormalizedMeasure: true,
            },
          ],
        },
      ];
    }
    // If this item comes after the gate quiz, it needs a precondition to check the gate
    else if (gateQuizIndex >= 0 && itemIndex > gateQuizIndex) {
      const globalObjectiveId = `${module.id}-gate-passed`;

      // Add objective that reads from global objective
      itemSeq.objectives = [
        {
          objectiveID: `local-${itemId}-prereq`,
          isPrimary: false,
          mapInfo: [
            {
              targetObjectiveID: globalObjectiveId,
              readSatisfiedStatus: true,
              writeSatisfiedStatus: false,
              readNormalizedMeasure: true,
              writeNormalizedMeasure: false,
            },
          ],
        },
      ];

      // Add precondition rule: disable if objective not satisfied
      itemSeq.preconditions = [
        {
          ruleConditions: [
            {
              objectiveID: `local-${itemId}-prereq`,
              condition: 'satisfied',
              operator: 'not',
            },
          ],
          ruleAction: 'disabled',
        },
      ];
    }
  }

  // Apply branching rules for conditional routes
  addBranchingRules();

  // Only return if there's actual sequencing config
  if (
    itemSeq.controlMode ||
    itemSeq.objectives ||
    itemSeq.preconditions ||
    itemSeq.postconditions
  ) {
    return itemSeq;
  }

  return undefined;
}

/**
 * Build organization-level sequencing for a module
 */
function buildModuleSequencing(
  module: Module,
  generatedSequencing?: GeneratedSequencing
): OrganizationSequencing | undefined {
  // If scenario module with generated sequencing, use that control mode
  if (generatedSequencing?.controlMode) {
    return {
      controlMode: generatedSequencing.controlMode,
    };
  }

  const sequencing = module.sequencing;
  if (!sequencing) {
    return undefined;
  }

  const orgSeq: OrganizationSequencing = {};

  // For linear mode at module level
  if (sequencing.mode === 'linear') {
    orgSeq.controlMode = {
      flow: true,
      choice: true,
      forwardOnly: true,
    };
  }

  // For scenario mode
  if (sequencing.mode === 'scenario') {
    orgSeq.controlMode = {
      flow: false,
      choice: true,
      forwardOnly: false,
    };
  }

  if (
    (sequencing.branches && sequencing.branches.length > 0) ||
    (sequencing.choices && sequencing.choices.length > 0)
  ) {
    orgSeq.controlMode = orgSeq.controlMode ?? {};
    if (orgSeq.controlMode.flow === undefined) {
      orgSeq.controlMode.flow = true;
    }
    if (orgSeq.controlMode.choice === undefined) {
      orgSeq.controlMode.choice = true;
    }
  }

  if (orgSeq.controlMode) {
    return orgSeq;
  }

  return undefined;
}

export function buildManifestFromCourse(
  course: Course,
  lessons: Lesson[],
  mediaFiles: MediaFile[],
  quizzes: Quiz[] = []
): string {
  // Create maps for quick lookup
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const quizMap = new Map(quizzes.map((q) => [q.id, q]));

  // Build organization items
  const orgItems: OrganizationItem[] = [];

  for (const module of course.modules) {
    const moduleItems: OrganizationItem[] = [];

    // Check if this is a scenario module with generated sequencing
    const generatedSequencing = module.generatedSequencing;

    if (generatedSequencing) {
      // Use pre-generated items with sequencing from scenario builder
      for (const genItem of generatedSequencing.items) {
        const lesson = lessonMap.get(genItem.identifier);
        const quiz = quizMap.get(genItem.identifier);

        if (lesson || quiz) {
          moduleItems.push({
            identifier: `ITEM-${genItem.identifier}`,
            title: genItem.title,
            identifierref: `RES-${genItem.identifier}`,
            sequencing: genItem.sequencing,
          });
        }
      }
    } else {
      // Regular module - build items normally
      for (let i = 0; i < module.items.length; i++) {
        const itemId = module.items[i];
        const lesson = lessonMap.get(itemId);
        const quiz = quizMap.get(itemId);

        if (lesson) {
          const itemSequencing = buildItemSequencing(module, itemId, i, false);
          moduleItems.push({
            identifier: `ITEM-${itemId}`,
            title: lesson.title,
            identifierref: `RES-${itemId}`,
            sequencing: itemSequencing,
          });
        } else if (quiz) {
          const itemSequencing = buildItemSequencing(module, itemId, i, true, quiz.passing_score);
          moduleItems.push({
            identifier: `ITEM-${itemId}`,
            title: quiz.title,
            identifierref: `RES-${itemId}`,
            sequencing: itemSequencing,
          });
        }
      }
    }

    const moduleSequencing = buildModuleSequencing(module, generatedSequencing);
    orgItems.push({
      identifier: `ITEM-${module.id}`,
      title: module.title,
      items: moduleItems,
      sequencing: moduleSequencing,
    });
  }

  // Build resources
  const resources: Resource[] = [];

  // Shared theme assets live in one asset resource that every SCO references
  // via <dependency>, per IMS content packaging
  const COMMON_ASSETS_ID = 'RES-common-assets';
  resources.push({
    identifier: COMMON_ASSETS_ID,
    type: 'webcontent',
    scormType: 'asset',
    files: ['assets/schorm-runtime.js', 'assets/styles.css'],
  });

  // Media paths actually copied into the package, and which of them get
  // claimed by the lesson that uses them. MediaItem.src is normalized to the
  // same in-package "media/..." form as MediaFile paths.
  const packagedMedia = new Set(mediaFiles.map((f) => `media/${f.relativePath}`));
  const claimedMedia = new Set<string>();

  // Add index.html as a resource (not a SCO, just webcontent)
  const indexResource: Resource = {
    identifier: 'RES-index',
    type: 'webcontent',
    scormType: 'asset',
    href: 'index.html',
    files: ['index.html'],
    dependencies: [COMMON_ASSETS_ID],
  };
  resources.push(indexResource);

  for (const lesson of lessons) {
    const files = [`${lesson.id}.html`];

    // Declare the media files this lesson uses on its own resource
    for (const mediaItem of lesson.media ?? []) {
      if (packagedMedia.has(mediaItem.src) && !files.includes(mediaItem.src)) {
        files.push(mediaItem.src);
        claimedMedia.add(mediaItem.src);
      }
    }

    resources.push({
      identifier: `RES-${lesson.id}`,
      type: 'webcontent',
      scormType: 'sco',
      href: `${lesson.id}.html`,
      files,
      dependencies: [COMMON_ASSETS_ID],
    });
  }

  // Add quiz resources
  for (const quiz of quizzes) {
    resources.push({
      identifier: `RES-${quiz.id}`,
      type: 'webcontent',
      scormType: 'sco',
      href: `${quiz.id}.html`,
      files: [`${quiz.id}.html`],
      dependencies: [COMMON_ASSETS_ID],
    });
  }

  // Media not referenced by any lesson is still packaged - list it once on
  // the index resource so every shipped file is declared in the manifest
  for (const mediaPath of packagedMedia) {
    if (!claimedMedia.has(mediaPath)) {
      indexResource.files.push(mediaPath);
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
