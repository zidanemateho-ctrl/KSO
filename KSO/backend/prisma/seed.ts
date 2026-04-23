import {
  AlertSeverity,
  AttendanceStatus,
  BadgeType,
  CompetencyCategory,
  EducationSystem,
  InternshipType,
  OpportunityType,
  PlanStatus,
  Quarter,
  Role,
  SchoolType,
  Semester,
  Sequence,
  SessionStatus,
  Stream,
  StudentLevel,
  StudentProfileType
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { gradeService } from "../src/services/grade.service";
import { hashPassword } from "../src/utils/password";

const ACADEMIC_YEAR = "2025-2026";
const STUDENTS_PER_SCHOOL = 80;

const SECONDARY_LEVELS: StudentLevel[] = [StudentLevel.SECONDE, StudentLevel.PREMIERE, StudentLevel.TERMINALE];
const SECONDARY_STREAMS: Stream[] = [
  Stream.SCIENTIFIQUE,
  Stream.LITTERAIRE,
  Stream.ECONOMIQUE,
  Stream.TECHNIQUE
];

const ANGLOPHONE_LEVELS: StudentLevel[] = [StudentLevel.LOWER_SIXTH, StudentLevel.UPPER_SIXTH];
const ANGLOPHONE_STREAMS: Stream[] = [
  Stream.SCIENTIFIQUE,
  Stream.LITTERAIRE,
  Stream.TECHNIQUE
];

const SCHOOL_SEEDS = [
  {
    name: "Lycee KSO Douala",
    code: "KSO-LYC-001",
    city: "Douala",
    adminName: "Admin Lycee Douala",
    adminEmail: "admin.lycee@kso.local"
  },
  {
    name: "Lycee KSO Yaounde",
    code: "KSO-LYC-002",
    city: "Yaounde",
    adminName: "Admin Lycee Yaounde",
    adminEmail: "admin.lycee2@kso.local"
  },
  {
    name: "Lycee KSO Bafoussam",
    code: "KSO-LYC-003",
    city: "Bafoussam",
    adminName: "Admin Lycee Bafoussam",
    adminEmail: "admin.lycee3@kso.local"
  },
  {
    name: "Lycee KSO Garoua",
    code: "KSO-LYC-004",
    city: "Garoua",
    adminName: "Admin Lycee Garoua",
    adminEmail: "admin.lycee4@kso.local"
  },
  {
    name: "Lycee KSO Kribi",
    code: "KSO-LYC-005",
    city: "Kribi",
    adminName: "Admin Lycee Kribi",
    adminEmail: "admin.lycee5@kso.local"
  }
] as const;

const SUBJECT_SEEDS = [
  { name: "Mathematiques", coefficient: 5, isCore: true },
  { name: "Physique", coefficient: 4, isCore: true },
  { name: "SVT", coefficient: 3, isCore: true },
  { name: "Francais", coefficient: 4, isCore: true },
  { name: "Anglais", coefficient: 3, isCore: true },
  { name: "Informatique", coefficient: 3, isCore: true },
  { name: "Histoire-Geographie", coefficient: 2, isCore: true },
  { name: "Economie", coefficient: 4, isCore: true }
] as const;

const STREAM_SUBJECTS: Record<Stream, string[]> = {
  SCIENTIFIQUE: ["Mathematiques", "Physique", "SVT", "Informatique"],
  LITTERAIRE: ["Francais", "Anglais", "Histoire-Geographie", "Mathematiques"],
  ECONOMIQUE: ["Economie", "Mathematiques", "Anglais", "Histoire-Geographie"],
  TECHNIQUE: ["Mathematiques", "Informatique", "Physique", "Economie"],
  AUTRE: ["Mathematiques", "Francais", "Anglais", "Histoire-Geographie"]
};

const PREFERRED_SUBJECT_BY_STREAM: Record<Stream, string> = {
  SCIENTIFIQUE: "Mathematiques",
  LITTERAIRE: "Francais",
  ECONOMIQUE: "Economie",
  TECHNIQUE: "Informatique",
  AUTRE: "Mathematiques"
};

const DREAM_CAREERS: Record<Stream, string[]> = {
  SCIENTIFIQUE: ["Ingenieur logiciel", "Medecin", "Data scientist", "Architecte"],
  LITTERAIRE: ["Journaliste", "Juriste", "Professeur de lettres", "Diplomate"],
  ECONOMIQUE: ["Analyste financier", "Expert-comptable", "Entrepreneur", "Economiste"],
  TECHNIQUE: ["Ingenieur telecom", "Technicien industriel", "DevOps", "Ingenieur reseau"],
  AUTRE: ["Consultant", "Designer", "Coach pedagogique", "Chef de projet"]
};

function pad(value: number, size = 3) {
  return String(value).padStart(size, "0");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");
}

function levelLabel(level: StudentLevel) {
  if (level === StudentLevel.SECONDE) {
    return "2nde";
  }

  if (level === StudentLevel.PREMIERE) {
    return "1ere";
  }

  if (level === StudentLevel.TERMINALE) {
    return "Tle";
  }

  if (level === StudentLevel.LOWER_SIXTH) {
    return "Lower Sixth";
  }

  if (level === StudentLevel.UPPER_SIXTH) {
    return "Upper Sixth";
  }

  return "Cycle";
}

function streamLabel(stream: Stream) {
  if (stream === Stream.SCIENTIFIQUE) {
    return "Scientifique";
  }

  if (stream === Stream.LITTERAIRE) {
    return "Litteraire";
  }

  if (stream === Stream.ECONOMIQUE) {
    return "Economique";
  }

  if (stream === Stream.TECHNIQUE) {
    return "Technique";
  }

  return "General";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distribute(total: number, slots: number) {
  const base = Math.floor(total / slots);
  const remainder = total % slots;

  return Array.from({ length: slots }, (_, index) => base + (index < remainder ? 1 : 0));
}

function admissionYearForLevel(level: StudentLevel) {
  if (level === StudentLevel.SECONDE) {
    return 2024;
  }

  if (level === StudentLevel.PREMIERE) {
    return 2023;
  }

  if (level === StudentLevel.LOWER_SIXTH) {
    return 2023;
  }

  if (level === StudentLevel.UPPER_SIXTH) {
    return 2022;
  }

  return 2022;
}

function pickCareer(stream: Stream, seed: number) {
  const careers = DREAM_CAREERS[stream];
  return careers[seed % careers.length];
}

function computeScore(level: StudentLevel, stream: Stream, semester: Semester, subjectIndex: number, seed: number) {
  const baseByLevel: Record<StudentLevel, number> = {
    SECONDE: 11.3,
    PREMIERE: 12.2,
    TERMINALE: 13.1,
    LOWER_SIXTH: 12.2,
    UPPER_SIXTH: 13.1,
    LICENCE_1: 12,
    LICENCE_2: 12,
    LICENCE_3: 12,
    MASTER_1: 12,
    MASTER_2: 12,
    AUTRE: 11.5
  };

  const streamBoost: Record<Stream, number> = {
    SCIENTIFIQUE: 0.8,
    LITTERAIRE: 0.5,
    ECONOMIQUE: 0.6,
    TECHNIQUE: 0.7,
    AUTRE: 0.3
  };

  const semesterBoost = semester === Semester.SEMESTER_2 ? 0.35 : 0;
  const subjectBoost = subjectIndex * 0.22;
  const jitter = (((seed * 13 + subjectIndex * 7 + (semester === Semester.SEMESTER_1 ? 5 : 11)) % 15) - 7) * 0.18;

  return Number(clamp(baseByLevel[level] + streamBoost[stream] + semesterBoost + subjectBoost + jitter, 7.5, 18.9).toFixed(2));
}

async function clearDatabase() {
  await prisma.discussionMessage.deleteMany();
  await prisma.discussionGroup.deleteMany();
  await prisma.externalSyncLog.deleteMany();
  await prisma.alumniOutcome.deleteMany();
  await prisma.studentBadge.deleteMany();
  await prisma.wellbeingCheckin.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.weeklyJournalEntry.deleteMany();
  await prisma.mentorshipSession.deleteMany();
  await prisma.internshipApplication.deleteMany();
  await prisma.studentOpportunity.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.competencyAssessment.deleteMany();
  await prisma.behaviorIncident.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.planCollaborator.deleteMany();
  await prisma.planTask.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.studentAlert.deleteMany();
  await prisma.studentPlan.deleteMany();
  await prisma.orientationProfile.deleteMany();
  await prisma.result.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.teacherClassSubject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
}

async function main() {
  await clearDatabase();

  const superAdminHash = await hashPassword("SuperAdmin123!");
  const adminHash = await hashPassword("Admin123!");
  const teacherHash = await hashPassword("Teacher123!");
  const learnerHash = await hashPassword("Learner123!");
  const parentHash = await hashPassword("Parent123!");

  await prisma.user.create({
    data: {
      fullName: "KSO Super Admin",
      email: "superadmin@kso.local",
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN
    }
  });

  let firstAdminUserId: string | null = null;
  let demoTeacherUserId: string | null = null;
  let demoParentUserId: string | null = null;
  let demoStudentId: string | null = null;
  const terminalScientificUserIds: string[] = [];

  for (let schoolIndex = 0; schoolIndex < SCHOOL_SEEDS.length; schoolIndex += 1) {
    const seed = SCHOOL_SEEDS[schoolIndex];

    const school = await prisma.school.create({
      data: {
        name: seed.name,
        code: seed.code,
        city: seed.city,
        country: "Cameroon",
        type: SchoolType.HIGH_SCHOOL
      }
    });

    const adminUser = await prisma.user.create({
      data: {
        fullName: seed.adminName,
        email: seed.adminEmail,
        passwordHash: adminHash,
        role: Role.HIGH_SCHOOL_ADMIN,
        schoolId: school.id
      }
    });

    if (!firstAdminUserId) {
      firstAdminUserId = adminUser.id;
    }

    const schoolSlug = slugify(seed.code);

    const subjects = await Promise.all(
      SUBJECT_SEEDS.map((subject) =>
        prisma.subject.create({
          data: {
            schoolId: school.id,
            name: subject.name,
            coefficient: subject.coefficient,
            isCore: subject.isCore
          }
        })
      )
    );

    const subjectByName = new Map(subjects.map((subject) => [subject.name, subject]));
    const teacherBySubjectId = new Map<string, { teacherId: string; userId: string }>();

    for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex += 1) {
      const subject = subjects[subjectIndex];
      const isMainTeacherAccount = schoolIndex === 0 && subject.name === "Mathematiques";

      const teacherUser = await prisma.user.create({
        data: {
          fullName: isMainTeacherAccount ? "Mme Bella Ngue" : `Enseignant ${subject.name} ${seed.city}`,
          email: isMainTeacherAccount
            ? "teacher.lycee@kso.local"
            : `teacher.${schoolSlug}.${pad(subjectIndex + 1, 2)}@kso.local`,
          passwordHash: teacherHash,
          role: Role.TEACHER,
          schoolId: school.id
        }
      });

      const teacher = await prisma.teacher.create({
        data: {
          schoolId: school.id,
          userId: teacherUser.id,
          employeeCode: `${seed.code.replace(/[^A-Z0-9]/g, "")}-T${pad(subjectIndex + 1, 2)}`,
          fullName: teacherUser.fullName,
          speciality: subject.name
        }
      });

      teacherBySubjectId.set(subject.id, {
        teacherId: teacher.id,
        userId: teacherUser.id
      });

      if (isMainTeacherAccount) {
        demoTeacherUserId = teacherUser.id;
      }
    }

    const classes: Array<{ id: string; level: StudentLevel; stream: Stream; room: string; name: string; educationSystem: EducationSystem }> = [];

    for (let levelIndex = 0; levelIndex < SECONDARY_LEVELS.length; levelIndex += 1) {
      const level = SECONDARY_LEVELS[levelIndex];

      for (let streamIndex = 0; streamIndex < SECONDARY_STREAMS.length; streamIndex += 1) {
        const stream = SECONDARY_STREAMS[streamIndex];

        const classEntity = await prisma.class.create({
          data: {
            schoolId: school.id,
            name: `${levelLabel(level)} ${streamLabel(stream)}`,
            room: `${String.fromCharCode(65 + levelIndex)}-${streamIndex + 1}`,
            level,
            stream,
            educationSystem: EducationSystem.FRANCOPHONE,
            academicYear: ACADEMIC_YEAR
          }
        });

        classes.push({
          id: classEntity.id,
          level,
          stream,
          room: classEntity.room || "",
          name: classEntity.name,
          educationSystem: EducationSystem.FRANCOPHONE
        });
      }
    }

    // Créer les classes du système anglophone (Lower Sixth, Upper Sixth)
    for (let levelIndex = 0; levelIndex < ANGLOPHONE_LEVELS.length; levelIndex += 1) {
      const level = ANGLOPHONE_LEVELS[levelIndex];

      for (let streamIndex = 0; streamIndex < ANGLOPHONE_STREAMS.length; streamIndex += 1) {
        const stream = ANGLOPHONE_STREAMS[streamIndex];

        const classEntity = await prisma.class.create({
          data: {
            schoolId: school.id,
            name: `${levelLabel(level)} ${streamLabel(stream)}`,
            room: `${String.fromCharCode(67 + levelIndex)}-${streamIndex + 1}`,
            level,
            stream,
            educationSystem: EducationSystem.ANGLOPHONE,
            academicYear: ACADEMIC_YEAR
          }
        });

        classes.push({
          id: classEntity.id,
          level,
          stream,
          room: classEntity.room || "",
          name: classEntity.name,
          educationSystem: EducationSystem.ANGLOPHONE
        });
      }
    }

    const assignmentRows: Array<{ schoolId: string; teacherId: string; classId: string; subjectId: string }> = [];

    for (const classEntity of classes) {
      for (const subject of subjects) {
        const teacherRef = teacherBySubjectId.get(subject.id);

        if (!teacherRef) {
          continue;
        }

        assignmentRows.push({
          schoolId: school.id,
          teacherId: teacherRef.teacherId,
          classId: classEntity.id,
          subjectId: subject.id
        });
      }
    }

    await prisma.teacherClassSubject.createMany({ data: assignmentRows });

    const slots = classes.length;
    const studentsPerClass = distribute(STUDENTS_PER_SCHOOL, slots);
    let schoolStudentCounter = 0;

    const gradeRows: Array<{
      schoolId: string;
      studentId: string;
      classId: string;
      subjectId: string;
      teacherId: string;
      semester: Semester;
      sequence: Sequence;
      score: number;
      maxScore: number;
    }> = [];

    for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
      const classEntity = classes[classIndex];
      const count = studentsPerClass[classIndex];

      for (let localIndex = 0; localIndex < count; localIndex += 1) {
        schoolStudentCounter += 1;

        const isDemoStudent = schoolIndex === 0 && schoolStudentCounter === 1;
        const studentSuffix = pad(schoolStudentCounter);
        const studentEmail = isDemoStudent ? "eleve.lycee@kso.local" : `eleve.${schoolSlug}.${studentSuffix}@kso.local`;
        const parentEmail = isDemoStudent ? "parent@kso.local" : `parent.${schoolSlug}.${studentSuffix}@kso.local`;

        const studentUser = await prisma.user.create({
          data: {
            fullName: isDemoStudent ? "Aline Mbia" : `Eleve ${seed.city} ${studentSuffix}`,
            email: studentEmail,
            passwordHash: learnerHash,
            role: Role.STUDENT,
            schoolId: school.id
          }
        });

        const preferredSubjectName = PREFERRED_SUBJECT_BY_STREAM[classEntity.stream] || "Mathematiques";
        const preferredSubject = subjectByName.get(preferredSubjectName) || subjectByName.get("Mathematiques");

        if (!preferredSubject) {
          throw new Error("Sujet prefere introuvable");
        }

        const student = await prisma.student.create({
          data: {
            schoolId: school.id,
            userId: studentUser.id,
            classId: classEntity.id,
            preferredSubjectId: preferredSubject.id,
            registrationNumber: `${seed.code.replace(/[^A-Z0-9]/g, "")}-STD-${studentSuffix}`,
            fullName: studentUser.fullName,
            profileType: StudentProfileType.ELEVE,
            level: classEntity.level,
            stream: classEntity.stream,
            educationSystem: classEntity.educationSystem || EducationSystem.FRANCOPHONE,
            guardianPhone: `+23769${pad((schoolIndex + 1) * 100 + schoolStudentCounter, 6)}`,
            dreamCareer: pickCareer(classEntity.stream, schoolStudentCounter + classIndex),
            targetProfession: pickCareer(classEntity.stream, schoolStudentCounter + classIndex + 1),
            learningObjectives: `Consolider les acquis en ${streamLabel(classEntity.stream)} et viser une progression continue sur les 2 semestres.`,
            admissionYear: admissionYearForLevel(classEntity.level)
          }
        });

        const parentUser = await prisma.user.create({
          data: {
            fullName: isDemoStudent ? "Mme Claire Mbia" : `Parent ${seed.city} ${studentSuffix}`,
            email: parentEmail,
            passwordHash: parentHash,
            role: Role.PARENT,
            schoolId: school.id
          }
        });

        await prisma.parentStudent.create({
          data: {
            parentUserId: parentUser.id,
            studentId: student.id,
            relationship: "Parent"
          }
        });

        if (isDemoStudent) {
          demoStudentId = student.id;
          demoParentUserId = parentUser.id;
        }

        if (localIndex === 0 && classEntity.level === StudentLevel.TERMINALE && classEntity.stream === Stream.SCIENTIFIQUE) {
          terminalScientificUserIds.push(studentUser.id);
        }

        const subjectsForStream = STREAM_SUBJECTS[classEntity.stream] || STREAM_SUBJECTS.AUTRE;

        for (let semesterIndex = 0; semesterIndex < 2; semesterIndex += 1) {
          const semester = semesterIndex === 0 ? Semester.SEMESTER_1 : Semester.SEMESTER_2;
          const sequence = semesterIndex === 0 ? Sequence.SEQUENCE_1 : Sequence.SEQUENCE_2;

          for (let subjectIndex = 0; subjectIndex < subjectsForStream.length; subjectIndex += 1) {
            const subjectName = subjectsForStream[subjectIndex];
            const subject = subjectByName.get(subjectName);

            if (!subject) {
              continue;
            }

            const teacherRef = teacherBySubjectId.get(subject.id);
            if (!teacherRef) {
              continue;
            }

            gradeRows.push({
              schoolId: school.id,
              studentId: student.id,
              classId: classEntity.id,
              subjectId: subject.id,
              teacherId: teacherRef.teacherId,
              semester,
              sequence,
              score: computeScore(classEntity.level, classEntity.stream, semester, subjectIndex, schoolStudentCounter + schoolIndex),
              maxScore: 20
            });
          }
        }
      }
    }

    await prisma.grade.createMany({ data: gradeRows });

    for (const classEntity of classes) {
      await gradeService.recomputeClassSemester(school.id, classEntity.id, Semester.SEMESTER_1);
      await gradeService.recomputeClassSemester(school.id, classEntity.id, Semester.SEMESTER_2);
    }
  }

  if (demoStudentId && demoTeacherUserId && demoParentUserId) {
    const demoStudent = await prisma.student.findUnique({ where: { id: demoStudentId } });

    if (demoStudent) {
      const plan = await prisma.studentPlan.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          title: "Plan de preparation post-bac",
          description: "Consolider les matieres majeures et preparer les candidatures",
          status: PlanStatus.EN_COURS,
          quarter: Quarter.Q2,
          progressPercent: 48,
          createdByUserId: demoTeacherUserId
        }
      });

      await prisma.planTask.createMany({
        data: [
          {
            planId: plan.id,
            title: "Serie d exercices mathematiques",
            description: "Deux blocs d exercices par semaine",
            status: PlanStatus.EN_COURS
          },
          {
            planId: plan.id,
            title: "Atelier orientation",
            description: "Finaliser 3 choix de filieres",
            status: PlanStatus.A_FAIRE
          }
        ]
      });

      await prisma.planCollaborator.createMany({
        data: [
          {
            planId: plan.id,
            userId: demoTeacherUserId,
            roleLabel: "Coach academique"
          },
          {
            planId: plan.id,
            userId: demoParentUserId,
            roleLabel: "Suivi parental"
          }
        ]
      });

      await prisma.studentAlert.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          severity: AlertSeverity.ATTENTION,
          category: "RISQUE_ACADEMIQUE",
          title: "Suivi hebdomadaire recommande",
          message: "Maintenir un rythme de travail regulier en Physique et en Mathematiques"
        }
      });

      await prisma.attendanceRecord.createMany({
        data: [
          {
            schoolId: demoStudent.schoolId,
            studentId: demoStudent.id,
            date: new Date("2026-03-18"),
            status: AttendanceStatus.PRESENT
          },
          {
            schoolId: demoStudent.schoolId,
            studentId: demoStudent.id,
            date: new Date("2026-03-19"),
            status: AttendanceStatus.RETARD,
            note: "Arrivee tardive"
          }
        ]
      });

      await prisma.competencyAssessment.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          category: CompetencyCategory.NUMERIQUE,
          label: "Resolution de problemes",
          score: 76,
          assessedByUserId: demoTeacherUserId
        }
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          schoolId: demoStudent.schoolId,
          title: "Programme d ete STEM 2026",
          description: "Programme intensif pour Terminale scientifique",
          type: OpportunityType.PROGRAMME,
          targetStream: Stream.SCIENTIFIQUE,
          targetLevel: StudentLevel.TERMINALE,
          targetProfile: StudentProfileType.ELEVE,
          targetSchoolType: SchoolType.HIGH_SCHOOL,
          location: "Cameroon",
          createdByUserId: demoTeacherUserId
        }
      });

      await prisma.studentOpportunity.create({
        data: {
          studentId: demoStudent.id,
          opportunityId: opportunity.id,
          matchScore: 90,
          rationale: "Profil scientifique solide avec progression reguliere"
        }
      });

      await prisma.internshipApplication.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          type: InternshipType.STAGE,
          title: "Stage d observation numerique",
          organization: "TechBridge",
          status: "EN_COURS"
        }
      });

      await prisma.mentorshipSession.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          mentorUserId: demoTeacherUserId,
          mentorName: "Mme Bella Ngue",
          topic: "Preparation classes preparatoires",
          scheduledAt: new Date("2026-05-10T15:00:00.000Z"),
          status: SessionStatus.PLANIFIEE
        }
      });

      await prisma.weeklyJournalEntry.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          weekStart: new Date("2026-04-06"),
          summary: "Progression visible en mathematiques.",
          parentNote: "Encouragements a domicile.",
          teacherNote: "Consolider la physique.",
          tips: "2 revisions guidees par semaine",
          createdByUserId: demoTeacherUserId
        }
      });

      await prisma.wellbeingCheckin.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          mood: 4,
          stress: 3,
          energy: 4,
          comment: "Motivation stable"
        }
      });

      await prisma.studentBadge.create({
        data: {
          schoolId: demoStudent.schoolId,
          studentId: demoStudent.id,
          badgeType: BadgeType.PROGRESSION,
          title: "Progression constante",
          description: "Amelioration de la moyenne sur deux semestres",
          points: 60,
          awardedByUserId: demoTeacherUserId
        }
      });

      await prisma.externalSyncLog.create({
        data: {
          schoolId: demoStudent.schoolId,
          source: "LMS_DEMO",
          action: "SYNC_GRADES",
          status: "SUCCESS",
          message: "Synchronisation de demonstration"
        }
      });
    }
  }

  if (firstAdminUserId) {
    for (const level of SECONDARY_LEVELS) {
      for (const stream of SECONDARY_STREAMS) {
        const uniqueKey = `ELEVE_${level}_${stream}_${ACADEMIC_YEAR}`;
        const name = `Forum ${levelLabel(level)} ${streamLabel(stream)} Inter-etablissements`;

        await prisma.discussionGroup.upsert({
          where: { uniqueKey },
          create: {
            uniqueKey,
            name,
            profileType: StudentProfileType.ELEVE,
            level,
            stream,
            academicYear: ACADEMIC_YEAR,
            createdByUserId: firstAdminUserId
          },
          update: {
            name
          }
        });
      }
    }
  }

  if (terminalScientificUserIds.length >= 2) {
    const group = await prisma.discussionGroup.findUnique({
      where: {
        uniqueKey: `ELEVE_${StudentLevel.TERMINALE}_${Stream.SCIENTIFIQUE}_${ACADEMIC_YEAR}`
      }
    });

    if (group) {
      await prisma.discussionMessage.createMany({
        data: [
          {
            groupId: group.id,
            senderUserId: terminalScientificUserIds[0],
            content: "Bonjour la team, qui revise la mecanique ce week-end ?"
          },
          {
            groupId: group.id,
            senderUserId: terminalScientificUserIds[1],
            content: "Je partage ma fiche de revision ce soir, on peut faire une session commune."
          }
        ]
      });
    }
  }

  const schoolCount = await prisma.school.count();
  const studentCount = await prisma.student.count();
  const parentCount = await prisma.user.count({ where: { role: Role.PARENT } });

  console.log(`Seed termine: ${schoolCount} etablissements, ${studentCount} eleves, ${parentCount} parents`);
  console.log("Super admin: superadmin@kso.local / SuperAdmin123!");
  console.log("Admin lycee 1: admin.lycee@kso.local / Admin123!");
  console.log("Enseignant demo: teacher.lycee@kso.local / Teacher123!");
  console.log("Eleve demo: eleve.lycee@kso.local / Learner123!");
  console.log("Parent demo: parent@kso.local / Parent123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
