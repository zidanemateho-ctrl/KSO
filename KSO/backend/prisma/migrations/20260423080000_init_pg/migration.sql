-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COLLEGE_ADMIN', 'HIGH_SCHOOL_ADMIN', 'UNIVERSITY_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'UNIVERSITY_STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('COLLEGE', 'HIGH_SCHOOL', 'UNIVERSITY');

-- CreateEnum
CREATE TYPE "StudentLevel" AS ENUM ('SECONDE', 'PREMIERE', 'TERMINALE', 'LOWER_SIXTH', 'UPPER_SIXTH', 'LICENCE_1', 'LICENCE_2', 'LICENCE_3', 'MASTER_1', 'MASTER_2', 'AUTRE');

-- CreateEnum
CREATE TYPE "EducationSystem" AS ENUM ('FRANCOPHONE', 'ANGLOPHONE');

-- CreateEnum
CREATE TYPE "Stream" AS ENUM ('SCIENTIFIQUE', 'LITTERAIRE', 'ECONOMIQUE', 'TECHNIQUE', 'AUTRE');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('SEMESTER_1', 'SEMESTER_2');

-- CreateEnum
CREATE TYPE "Sequence" AS ENUM ('SEQUENCE_1', 'SEQUENCE_2', 'SEQUENCE_3');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('EXCELLENT', 'ADMIS', 'EN_DIFFICULTE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE');

-- CreateEnum
CREATE TYPE "StudentProfileType" AS ENUM ('ELEVE', 'ETUDIANT');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'ATTENTION', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "Quarter" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'RETARD');

-- CreateEnum
CREATE TYPE "CompetencyCategory" AS ENUM ('ACADEMIQUE', 'COMMUNICATION', 'LEADERSHIP', 'COLLABORATION', 'AUTONOMIE', 'NUMERIQUE', 'CREATIVITE');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('FILIERE', 'METIER', 'BOURSE', 'CONCOURS', 'PROGRAMME');

-- CreateEnum
CREATE TYPE "InternshipType" AS ENUM ('STAGE', 'ALTERNANCE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('EN_COURS', 'PRESELECTIONNE', 'ACCEPTE', 'REFUSE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANIFIEE', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "PortfolioCategory" AS ENUM ('PROJET', 'CERTIFICATION', 'ACTIVITE', 'DISTINCTION');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('PROGRESSION', 'REGULARITE', 'EXCELLENCE', 'LEADERSHIP', 'ENTRAIDE');

-- CreateEnum
CREATE TYPE "AlumniOutcomeType" AS ENUM ('ETUDES_SUP', 'EMPLOI', 'ENTREPRENEURIAT', 'AUTRE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "schoolId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Cameroon',
    "type" "SchoolType" NOT NULL DEFAULT 'HIGH_SCHOOL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room" TEXT,
    "level" "StudentLevel" NOT NULL,
    "stream" "Stream" NOT NULL,
    "educationSystem" "EducationSystem" NOT NULL DEFAULT 'FRANCOPHONE',
    "academicYear" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "classId" TEXT,
    "preferredSubjectId" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "profileType" "StudentProfileType" NOT NULL DEFAULT 'ELEVE',
    "level" "StudentLevel" NOT NULL,
    "stream" "Stream" NOT NULL,
    "educationSystem" "EducationSystem" NOT NULL DEFAULT 'FRANCOPHONE',
    "guardianPhone" TEXT,
    "dreamCareer" TEXT,
    "targetProfession" TEXT,
    "learningObjectives" TEXT,
    "admissionYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "speciality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isCore" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherClassSubject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "semester" "Semester" NOT NULL,
    "sequence" "Sequence" NOT NULL DEFAULT 'SEQUENCE_1',
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "comment" TEXT,
    "importBatchId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "semester" "Semester" NOT NULL,
    "weightedAverage" DOUBLE PRECISION NOT NULL,
    "totalCoefficient" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "trend" DOUBLE PRECISION,
    "status" "ResultStatus" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrientationProfile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "recommendedStream" "Stream",
    "recommendedCareers" TEXT NOT NULL,
    "insights" TEXT,
    "explanation" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrientationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'A_FAIRE',
    "quarter" "Quarter",
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "dueDate" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'A_FAIRE',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCollaborator" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAlert" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorIncident" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reportedByUserId" TEXT,
    "category" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'ATTENTION',
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyAssessment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "category" "CompetencyCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "assessedByUserId" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "targetStream" "Stream",
    "targetLevel" "StudentLevel",
    "targetProfile" "StudentProfileType",
    "targetSchoolType" "SchoolType",
    "location" TEXT,
    "applicationUrl" TEXT,
    "deadline" TIMESTAMP(3),
    "tags" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentOpportunity" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipApplication" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "InternshipType" NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'EN_COURS',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "InternshipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorUserId" TEXT,
    "mentorName" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "meetingLink" TEXT,
    "notes" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANIFIEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyJournalEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "parentNote" TEXT,
    "teacherNote" TEXT,
    "tips" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "PortfolioCategory" NOT NULL,
    "url" TEXT,
    "evidence" TEXT,
    "awardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingCheckin" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mood" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellbeingCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBadge" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "awardedByUserId" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniOutcome" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "fullName" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "outcomeType" "AlumniOutcomeType" NOT NULL,
    "organization" TEXT,
    "country" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "trackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSyncLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payloadHash" TEXT,
    "status" "SyncStatus" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "targetSchoolId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionGroup" (
    "id" TEXT NOT NULL,
    "uniqueKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profileType" "StudentProfileType" NOT NULL,
    "level" "StudentLevel" NOT NULL,
    "stream" "Stream" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "isCrossSchool" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenHash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "School"("name");

-- CreateIndex
CREATE INDEX "Class_schoolId_level_stream_idx" ON "Class"("schoolId", "level", "stream");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_academicYear_key" ON "Class"("schoolId", "name", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_registrationNumber_key" ON "Student"("registrationNumber");

-- CreateIndex
CREATE INDEX "Student_schoolId_classId_idx" ON "Student"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "Student_schoolId_profileType_idx" ON "Student"("schoolId", "profileType");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_employeeCode_key" ON "Teacher"("employeeCode");

-- CreateIndex
CREATE INDEX "Teacher_schoolId_idx" ON "Teacher"("schoolId");

-- CreateIndex
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "TeacherClassSubject_schoolId_classId_idx" ON "TeacherClassSubject"("schoolId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClassSubject_teacherId_classId_subjectId_key" ON "TeacherClassSubject"("teacherId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "Grade_schoolId_classId_semester_sequence_idx" ON "Grade"("schoolId", "classId", "semester", "sequence");

-- CreateIndex
CREATE INDEX "Grade_studentId_semester_sequence_idx" ON "Grade"("studentId", "semester", "sequence");

-- CreateIndex
CREATE INDEX "Grade_subjectId_semester_sequence_idx" ON "Grade"("subjectId", "semester", "sequence");

-- CreateIndex
CREATE INDEX "Result_schoolId_classId_semester_idx" ON "Result"("schoolId", "classId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_classId_semester_key" ON "Result"("studentId", "classId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "OrientationProfile_studentId_key" ON "OrientationProfile"("studentId");

-- CreateIndex
CREATE INDEX "OrientationProfile_schoolId_riskLevel_idx" ON "OrientationProfile"("schoolId", "riskLevel");

-- CreateIndex
CREATE INDEX "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentUserId_studentId_key" ON "ParentStudent"("parentUserId", "studentId");

-- CreateIndex
CREATE INDEX "StudentPlan_schoolId_studentId_idx" ON "StudentPlan"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "StudentPlan_status_idx" ON "StudentPlan"("status");

-- CreateIndex
CREATE INDEX "PlanTask_planId_status_idx" ON "PlanTask"("planId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanCollaborator_planId_userId_key" ON "PlanCollaborator"("planId", "userId");

-- CreateIndex
CREATE INDEX "StudentAlert_schoolId_studentId_isRead_idx" ON "StudentAlert"("schoolId", "studentId", "isRead");

-- CreateIndex
CREATE INDEX "StudentAlert_severity_idx" ON "StudentAlert"("severity");

-- CreateIndex
CREATE INDEX "AttendanceRecord_schoolId_studentId_date_idx" ON "AttendanceRecord"("schoolId", "studentId", "date");

-- CreateIndex
CREATE INDEX "BehaviorIncident_schoolId_studentId_occurredAt_idx" ON "BehaviorIncident"("schoolId", "studentId", "occurredAt");

-- CreateIndex
CREATE INDEX "CompetencyAssessment_schoolId_studentId_category_idx" ON "CompetencyAssessment"("schoolId", "studentId", "category");

-- CreateIndex
CREATE INDEX "Opportunity_type_isActive_idx" ON "Opportunity"("type", "isActive");

-- CreateIndex
CREATE INDEX "Opportunity_targetStream_targetLevel_idx" ON "Opportunity"("targetStream", "targetLevel");

-- CreateIndex
CREATE INDEX "StudentOpportunity_matchScore_idx" ON "StudentOpportunity"("matchScore");

-- CreateIndex
CREATE UNIQUE INDEX "StudentOpportunity_studentId_opportunityId_key" ON "StudentOpportunity"("studentId", "opportunityId");

-- CreateIndex
CREATE INDEX "InternshipApplication_schoolId_studentId_status_idx" ON "InternshipApplication"("schoolId", "studentId", "status");

-- CreateIndex
CREATE INDEX "MentorshipSession_schoolId_studentId_scheduledAt_idx" ON "MentorshipSession"("schoolId", "studentId", "scheduledAt");

-- CreateIndex
CREATE INDEX "WeeklyJournalEntry_schoolId_weekStart_idx" ON "WeeklyJournalEntry"("schoolId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyJournalEntry_studentId_weekStart_key" ON "WeeklyJournalEntry"("studentId", "weekStart");

-- CreateIndex
CREATE INDEX "PortfolioItem_schoolId_studentId_category_idx" ON "PortfolioItem"("schoolId", "studentId", "category");

-- CreateIndex
CREATE INDEX "WellbeingCheckin_schoolId_studentId_createdAt_idx" ON "WellbeingCheckin"("schoolId", "studentId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentBadge_schoolId_studentId_badgeType_idx" ON "StudentBadge"("schoolId", "studentId", "badgeType");

-- CreateIndex
CREATE INDEX "AlumniOutcome_schoolId_graduationYear_outcomeType_idx" ON "AlumniOutcome"("schoolId", "graduationYear", "outcomeType");

-- CreateIndex
CREATE INDEX "ExternalSyncLog_schoolId_source_createdAt_idx" ON "ExternalSyncLog"("schoolId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "Announcement_isPublished_startsAt_endsAt_idx" ON "Announcement"("isPublished", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Announcement_targetSchoolId_idx" ON "Announcement"("targetSchoolId");

-- CreateIndex
CREATE INDEX "Announcement_createdByUserId_idx" ON "Announcement"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionGroup_uniqueKey_key" ON "DiscussionGroup"("uniqueKey");

-- CreateIndex
CREATE INDEX "DiscussionGroup_profileType_level_stream_academicYear_idx" ON "DiscussionGroup"("profileType", "level", "stream", "academicYear");

-- CreateIndex
CREATE INDEX "DiscussionMessage_groupId_createdAt_idx" ON "DiscussionMessage"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_preferredSubjectId_fkey" FOREIGN KEY ("preferredSubjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassSubject" ADD CONSTRAINT "TeacherClassSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassSubject" ADD CONSTRAINT "TeacherClassSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassSubject" ADD CONSTRAINT "TeacherClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassSubject" ADD CONSTRAINT "TeacherClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrientationProfile" ADD CONSTRAINT "OrientationProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrientationProfile" ADD CONSTRAINT "OrientationProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPlan" ADD CONSTRAINT "StudentPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPlan" ADD CONSTRAINT "StudentPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPlan" ADD CONSTRAINT "StudentPlan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCollaborator" ADD CONSTRAINT "PlanCollaborator_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCollaborator" ADD CONSTRAINT "PlanCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAlert" ADD CONSTRAINT "StudentAlert_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAlert" ADD CONSTRAINT "StudentAlert_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorIncident" ADD CONSTRAINT "BehaviorIncident_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorIncident" ADD CONSTRAINT "BehaviorIncident_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorIncident" ADD CONSTRAINT "BehaviorIncident_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyAssessment" ADD CONSTRAINT "CompetencyAssessment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyAssessment" ADD CONSTRAINT "CompetencyAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyAssessment" ADD CONSTRAINT "CompetencyAssessment_assessedByUserId_fkey" FOREIGN KEY ("assessedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentOpportunity" ADD CONSTRAINT "StudentOpportunity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentOpportunity" ADD CONSTRAINT "StudentOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipApplication" ADD CONSTRAINT "InternshipApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipApplication" ADD CONSTRAINT "InternshipApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipSession" ADD CONSTRAINT "MentorshipSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipSession" ADD CONSTRAINT "MentorshipSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipSession" ADD CONSTRAINT "MentorshipSession_mentorUserId_fkey" FOREIGN KEY ("mentorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyJournalEntry" ADD CONSTRAINT "WeeklyJournalEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyJournalEntry" ADD CONSTRAINT "WeeklyJournalEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyJournalEntry" ADD CONSTRAINT "WeeklyJournalEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingCheckin" ADD CONSTRAINT "WellbeingCheckin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingCheckin" ADD CONSTRAINT "WellbeingCheckin_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_awardedByUserId_fkey" FOREIGN KEY ("awardedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniOutcome" ADD CONSTRAINT "AlumniOutcome_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniOutcome" ADD CONSTRAINT "AlumniOutcome_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSyncLog" ADD CONSTRAINT "ExternalSyncLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_targetSchoolId_fkey" FOREIGN KEY ("targetSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionGroup" ADD CONSTRAINT "DiscussionGroup_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

